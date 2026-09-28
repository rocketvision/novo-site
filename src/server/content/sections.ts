import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb, schema, type Tx } from "@/server/db";
import { audit, diff } from "@/server/audit";
import { invalidate } from "@/server/cache";
import { conflict, notFound, unprocessable } from "@/server/http/errors";
import { syncMediaUsages } from "@/server/media/service";
import { DEFAULT_CONTENT } from "@/lib/content/defaults";
import { SECTION_SCHEMAS, isSectionKey, type SectionContent, type SectionKey } from "@/lib/content/schemas";
import { sectionByKey } from "@/lib/content/sections";
import { sectionMediaRefs } from "./refs";

type Actor = { id: string; email: string };
type Ctx = { ip: string | null; userAgent: string | null };

/**
 * Fluxo de uma seção: rascunho → pré-visualização → publicação.
 *
 * - O site só lê `published`. O rascunho aparece apenas na pré-visualização de quem está logado.
 * - Toda gravação exige a `version` que a pessoa abriu (concorrência otimista): se outra pessoa
 *   salvou antes, a resposta é 409 e nada é sobrescrito.
 * - O conteúdo é validado pelo schema da seção no servidor. Campos fora do schema são descartados.
 */

export function sectionTag(key: SectionKey) {
  return `section:${key}`;
}

export type SectionState<K extends SectionKey = SectionKey> = {
  key: K;
  draft: SectionContent<K>;
  published: SectionContent<K> | null;
  version: number;
  hasChanges: boolean;
  draftUpdatedAt: Date | null;
  draftUpdatedByName: string | null;
  publishedAt: Date | null;
  publishedByName: string | null;
};

function assertKey(key: string): asserts key is SectionKey {
  if (!isSectionKey(key)) throw notFound("Seção não encontrada.");
}

/** Conteúdo guardado passa pelo schema de novo ao ler: se o formato mudou, cai no padrão em vez de quebrar. */
function parseStored<K extends SectionKey>(key: K, value: unknown): SectionContent<K> | null {
  if (value === null || value === undefined) return null;
  const parsed = SECTION_SCHEMAS[key].safeParse(value);
  return parsed.success ? (parsed.data as SectionContent<K>) : null;
}

export async function getSectionState<K extends SectionKey>(key: K): Promise<SectionState<K>> {
  assertKey(key);
  const draftBy = sql<string | null>`(select name from users where id = ${schema.contentSections.draftUpdatedBy})`;
  const publishedBy = sql<string | null>`(select name from users where id = ${schema.contentSections.publishedBy})`;
  const [row] = await getDb()
    .select({
      draft: schema.contentSections.draft,
      published: schema.contentSections.published,
      version: schema.contentSections.version,
      draftUpdatedAt: schema.contentSections.draftUpdatedAt,
      publishedAt: schema.contentSections.publishedAt,
      draftUpdatedByName: draftBy,
      publishedByName: publishedBy,
    })
    .from(schema.contentSections)
    .where(eq(schema.contentSections.key, key));

  if (!row) {
    // Seção ainda não criada pelo seed: começa com o conteúdo atual do site, sem nada publicado.
    return {
      key,
      draft: DEFAULT_CONTENT[key] as SectionContent<K>,
      published: null,
      version: 0,
      hasChanges: true,
      draftUpdatedAt: null,
      draftUpdatedByName: null,
      publishedAt: null,
      publishedByName: null,
    };
  }

  const draft = parseStored(key, row.draft) ?? (DEFAULT_CONTENT[key] as SectionContent<K>);
  const published = parseStored(key, row.published);
  return {
    key,
    draft,
    published,
    version: row.version,
    hasChanges: JSON.stringify(row.draft) !== JSON.stringify(row.published),
    draftUpdatedAt: row.draftUpdatedAt,
    draftUpdatedByName: row.draftUpdatedByName,
    publishedAt: row.publishedAt,
    publishedByName: row.publishedByName,
  };
}

export async function listSectionStates() {
  const rows = await getDb()
    .select({
      key: schema.contentSections.key,
      version: schema.contentSections.version,
      hasChanges: sql<boolean>`${schema.contentSections.draft} IS DISTINCT FROM ${schema.contentSections.published}`,
      draftUpdatedAt: schema.contentSections.draftUpdatedAt,
      publishedAt: schema.contentSections.publishedAt,
    })
    .from(schema.contentSections);
  return new Map(rows.map((r) => [r.key, r]));
}

async function lockSection(tx: Tx, key: SectionKey, expectedVersion: number) {
  const [row] = await tx.select().from(schema.contentSections).where(eq(schema.contentSections.key, key)).for("update");
  const version = row?.version ?? 0;
  if (version !== expectedVersion) {
    throw conflict("Esta seção foi alterada por outra pessoa desde que você abriu. Recarregue para ver a versão atual.", "stale");
  }
  return row ?? null;
}

function validate<K extends SectionKey>(key: K, input: unknown): SectionContent<K> {
  const parsed = SECTION_SCHEMAS[key].safeParse(input);
  if (!parsed.success) throw unprocessable(parsed.error.issues);
  return parsed.data as SectionContent<K>;
}

/** Salva o rascunho. O site não muda. */
export async function saveDraft(actor: Actor, key: string, input: unknown, expectedVersion: number, ctx: Ctx) {
  assertKey(key);
  const content = validate(key, input);
  const meta = sectionByKey(key);

  return getDb().transaction(async (tx) => {
    const current = await lockSection(tx, key, expectedVersion);
    const before = current?.draft ?? null;
    const changes = diff(before, content);

    const values = { draft: content, draftUpdatedAt: new Date(), draftUpdatedBy: actor.id };
    const [row] = current
      ? await tx
          .update(schema.contentSections)
          .set({ ...values, version: sql`${schema.contentSections.version} + 1` })
          .where(eq(schema.contentSections.key, key))
          .returning({ version: schema.contentSections.version })
      : await tx.insert(schema.contentSections).values({ key, ...values }).returning({ version: schema.contentSections.version });

    await syncMediaUsages(tx, "section", key, sectionMediaRefs(meta.label, content, current?.published ?? null));
    if (Object.keys(changes).length > 0) {
      await audit(
        { actor, action: "section.draft_saved", resourceType: "section", resourceId: key, summary: `Salvou o rascunho de ${meta.label}`, changes, ...ctx },
        tx,
      );
    }
    return { version: row.version };
  });
}

/** Publica o rascunho atual: o site passa a mostrar exatamente o que foi pré-visualizado. */
export async function publishSection(actor: Actor, key: string, expectedVersion: number, ctx: Ctx) {
  assertKey(key);
  const meta = sectionByKey(key);

  const result = await getDb().transaction(async (tx) => {
    const current = await lockSection(tx, key, expectedVersion);
    if (!current) throw notFound("Seção não encontrada.");
    // Revalida no momento de publicar: o que vai ao ar sempre obedece ao schema atual.
    const content = validate(key, current.draft);
    const changes = diff(current.published, content);

    const [row] = await tx
      .update(schema.contentSections)
      .set({ published: content, publishedAt: new Date(), publishedBy: actor.id, version: sql`${schema.contentSections.version} + 1` })
      .where(eq(schema.contentSections.key, key))
      .returning({ version: schema.contentSections.version });

    await syncMediaUsages(tx, "section", key, sectionMediaRefs(meta.label, content, content));
    await audit(
      { actor, action: "section.published", resourceType: "section", resourceId: key, summary: `Publicou ${meta.label}`, changes, ...ctx },
      tx,
    );
    return { version: row.version };
  });

  // Só a seção publicada é invalidada; as páginas que a usam se atualizam no próximo acesso.
  invalidate(sectionTag(key));
  return result;
}

/** Descarta o rascunho e volta para a versão publicada. */
export async function discardDraft(actor: Actor, key: string, expectedVersion: number, ctx: Ctx) {
  assertKey(key);
  const meta = sectionByKey(key);
  return getDb().transaction(async (tx) => {
    const current = await lockSection(tx, key, expectedVersion);
    if (!current?.published) throw conflict("Esta seção ainda não foi publicada. Não há versão anterior para voltar.", "not_published");
    const changes = diff(current.draft, current.published);

    const [row] = await tx
      .update(schema.contentSections)
      .set({ draft: current.published, draftUpdatedAt: new Date(), draftUpdatedBy: actor.id, version: sql`${schema.contentSections.version} + 1` })
      .where(eq(schema.contentSections.key, key))
      .returning({ version: schema.contentSections.version });

    await syncMediaUsages(tx, "section", key, sectionMediaRefs(meta.label, current.published, current.published));
    await audit(
      { actor, action: "section.draft_discarded", resourceType: "section", resourceId: key, summary: `Descartou o rascunho de ${meta.label}`, changes, ...ctx },
      tx,
    );
    return { version: row.version };
  });
}
