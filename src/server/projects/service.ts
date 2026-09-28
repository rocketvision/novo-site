import "server-only";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema, type Tx } from "@/server/db";
import { audit, diff } from "@/server/audit";
import { CACHE_TAGS, invalidate } from "@/server/cache";
import { conflict, HttpError, notFound } from "@/server/http/errors";
import { isUuid, syncMediaUsages, type MediaRef } from "@/server/media/service";
import type { ProjectSnapshot } from "@/lib/projects/types";
import { contrastRatio, slugify, type ProjectInput } from "@/lib/validation/projects";

type Actor = { id: string; email: string };
type Ctx = { ip: string | null; userAgent: string | null };
type ProjectRow = typeof schema.projects.$inferSelect;
type ImageRow = typeof schema.projectImages.$inferSelect;

/**
 * Projetos do portfólio.
 *
 * - O formulário edita a cópia de trabalho (colunas da tabela). O site lê só `published_snapshot`.
 * - Publicar congela a cópia de trabalho no snapshot. Editar um projeto publicado não muda o site
 *   até "Publicar alterações".
 * - Toda gravação exige a `version` aberta na tela (409 se outra pessoa salvou antes).
 * - Despublicar e arquivar apagam o snapshot: nada de um projeto fora do ar fica acessível.
 * - Excluir de vez só é possível para projetos arquivados (exclusão segura em dois passos).
 */

export type ProjectStatus = ProjectRow["status"];

/* -------------------------------------------------------------------------- */
/* Leitura para o CMS                                                           */
/* -------------------------------------------------------------------------- */

export async function listProjects(input: { q?: string; status?: ProjectStatus }) {
  const where: SQL[] = [];
  if (input.status) where.push(eq(schema.projects.status, input.status));
  const q = input.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(schema.projects.name, pattern), ilike(schema.projects.client, pattern), ilike(schema.projects.category, pattern), ilike(schema.projects.slug, pattern))!);
  }
  const hasChanges = sql<boolean>`(${schema.projects.status} = 'published' AND ${schema.projects.updatedAt} > ${schema.projects.publishedAt})`;
  return getDb()
    .select({
      id: schema.projects.id,
      slug: schema.projects.slug,
      name: schema.projects.name,
      client: schema.projects.client,
      category: schema.projects.category,
      status: schema.projects.status,
      featured: schema.projects.featured,
      isSample: schema.projects.isSample,
      sortOrder: schema.projects.sortOrder,
      brandColor: schema.projects.brandColor,
      updatedAt: schema.projects.updatedAt,
      publishedAt: schema.projects.publishedAt,
      hasChanges,
      coverUrl: schema.media.url,
      coverBlur: schema.media.blurDataUrl,
    })
    .from(schema.projects)
    .leftJoin(schema.media, eq(schema.media.id, schema.projects.coverMediaId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.projects.featured), asc(schema.projects.sortOrder), desc(schema.projects.updatedAt));
}

export async function countProjectsByStatus() {
  const rows = await getDb()
    .select({ status: schema.projects.status, total: sql<number>`count(*)::int` })
    .from(schema.projects)
    .groupBy(schema.projects.status);
  const counts = { draft: 0, published: 0, archived: 0 };
  for (const r of rows) counts[r.status] = r.total;
  return counts;
}

async function loadImages(runner: Tx | ReturnType<typeof getDb>, projectId: string) {
  return runner
    .select()
    .from(schema.projectImages)
    .where(eq(schema.projectImages.projectId, projectId))
    .orderBy(asc(schema.projectImages.role), asc(schema.projectImages.position));
}

/** Converte linhas do banco no formato do formulário (o mesmo validado por projectInputSchema). */
export function toInput(row: ProjectRow, images: ImageRow[]): ProjectInput {
  return {
    name: row.name,
    slug: row.slug,
    client: row.client,
    category: row.category,
    projectDate: row.projectDate ?? "",
    summary: row.summary,
    description: row.description,
    context: row.context,
    solution: row.solution,
    results: row.results,
    services: row.services,
    highlights: row.highlights,
    brandColor: row.brandColor,
    accentColor: row.accentColor,
    tone: row.tone,
    coverMediaId: row.coverMediaId,
    logoMediaId: row.logoMediaId,
    ogMediaId: row.ogMediaId,
    desktopMediaId: images.find((i) => i.role === "desktop")?.mediaId ?? null,
    phoneMediaIds: images.filter((i) => i.role === "mobile").map((i) => i.mediaId),
    gallery: images.filter((i) => i.role === "gallery").map((i) => ({ mediaId: i.mediaId, caption: i.caption })),
    externalUrl: row.externalUrl,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    featured: row.featured,
  };
}

export async function getProject(id: string) {
  if (!isUuid(id)) return null;
  const db = getDb();
  const [row] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
  if (!row) return null;
  const images = await loadImages(db, id);
  const nameOf = async (userId: string | null) =>
    userId ? ((await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { name: true } }))?.name ?? null) : null;
  return {
    row,
    input: toInput(row, images),
    hasChanges: row.status === "published" && row.publishedAt !== null && row.updatedAt > row.publishedAt,
    updatedByName: await nameOf(row.updatedBy),
    publishedByName: await nameOf(row.publishedBy),
  };
}

/* -------------------------------------------------------------------------- */
/* Escrita                                                                      */
/* -------------------------------------------------------------------------- */

function columnsFrom(input: ProjectInput) {
  return {
    name: input.name,
    slug: input.slug,
    client: input.client,
    category: input.category,
    projectDate: input.projectDate || null,
    summary: input.summary,
    description: input.description,
    context: input.context,
    solution: input.solution,
    results: input.results,
    services: input.services,
    highlights: input.highlights,
    brandColor: input.brandColor,
    accentColor: input.accentColor,
    tone: input.tone,
    coverMediaId: input.coverMediaId,
    logoMediaId: input.logoMediaId,
    ogMediaId: input.ogMediaId,
    externalUrl: input.externalUrl,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    featured: input.featured,
  };
}

function mediaRefs(input: ProjectInput, stateLabel: string, prefix: string): MediaRef[] {
  const refs: MediaRef[] = [];
  const push = (mediaId: string | null, field: string, label: string) => mediaId && refs.push({ mediaId, field: `${prefix}:${field}`, label: `${label} (${stateLabel})` });
  push(input.coverMediaId, "cover", `Projeto ${input.name} · Capa`);
  push(input.logoMediaId, "logo", `Projeto ${input.name} · Logo`);
  push(input.ogMediaId, "og", `Projeto ${input.name} · Imagem de compartilhamento`);
  push(input.desktopMediaId, "desktop", `Projeto ${input.name} · Tela de computador`);
  input.phoneMediaIds.forEach((id, i) => push(id, `mobile.${i}`, `Projeto ${input.name} · Tela de celular ${i + 1}`));
  input.gallery.forEach((g, i) => push(g.mediaId, `gallery.${i}`, `Projeto ${input.name} · Galeria ${i + 1}`));
  return refs;
}

function snapshotRefs(snapshot: ProjectSnapshot | null): MediaRef[] {
  if (!snapshot) return [];
  return mediaRefs(
    {
      ...snapshot,
      brandColor: snapshot.theme.bg,
      accentColor: snapshot.theme.accent,
      tone: snapshot.theme.tone,
      featured: false,
    },
    "publicado",
    "published",
  );
}

async function writeImages(tx: Tx, projectId: string, input: ProjectInput) {
  await tx.delete(schema.projectImages).where(eq(schema.projectImages.projectId, projectId));
  const rows = [
    ...(input.desktopMediaId ? [{ projectId, mediaId: input.desktopMediaId, role: "desktop" as const, position: 0, caption: "" }] : []),
    ...input.phoneMediaIds.map((mediaId, position) => ({ projectId, mediaId, role: "mobile" as const, position, caption: "" })),
    ...input.gallery.map((g, position) => ({ projectId, mediaId: g.mediaId, role: "gallery" as const, position, caption: g.caption })),
  ];
  if (rows.length) await tx.insert(schema.projectImages).values(rows);
}

async function syncUsages(tx: Tx, projectId: string, input: ProjectInput, snapshot: ProjectSnapshot | null) {
  await syncMediaUsages(tx, "project", projectId, [...mediaRefs(input, "rascunho", "draft"), ...snapshotRefs(snapshot)]);
}

/** Slug livre? Considera a cópia de trabalho e o endereço publicado dos outros projetos. */
async function assertSlugAvailable(tx: Tx, slug: string, exceptId?: string) {
  const [taken] = await tx
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        or(eq(schema.projects.slug, slug), and(eq(schema.projects.status, "published"), sql`${schema.projects.publishedSnapshot} ->> 'slug' = ${slug}`)),
        exceptId ? ne(schema.projects.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  if (taken) {
    throw new HttpError(409, "slug_taken", "Já existe um projeto com este endereço.", { fields: { slug: "Este endereço já está em uso. Escolha outro." } });
  }
}

/** Violações de unicidade e de chave estrangeira viram respostas claras em vez de 500. */
function translateDbError(error: unknown): never {
  const code = (error as { code?: string }).code;
  const constraint = (error as { constraint?: string }).constraint ?? "";
  if (code === "23505" && constraint.includes("slug")) {
    throw new HttpError(409, "slug_taken", "Já existe um projeto com este endereço.", { fields: { slug: "Este endereço já está em uso. Escolha outro." } });
  }
  if (code === "23503" && constraint.includes("media")) {
    throw new HttpError(422, "media_missing", "Uma das imagens escolhidas foi removida da biblioteca. Escolha outra.");
  }
  throw error;
}

async function lockProject(tx: Tx, id: string, expectedVersion?: number) {
  if (!isUuid(id)) throw notFound("Projeto não encontrado.");
  const [row] = await tx.select().from(schema.projects).where(eq(schema.projects.id, id)).for("update");
  if (!row) throw notFound("Projeto não encontrado.");
  if (expectedVersion !== undefined && row.version !== expectedVersion) {
    throw conflict("Este projeto foi alterado por outra pessoa desde que você abriu. Recarregue para ver a versão atual.", "stale");
  }
  return row;
}

export async function createProject(actor: Actor, input: ProjectInput, ctx: Ctx) {
  try {
    return await getDb().transaction(async (tx) => {
      await assertSlugAvailable(tx, input.slug);
      const [{ next }] = await tx.select({ next: sql<number>`coalesce(max(${schema.projects.sortOrder}), 0) + 1` }).from(schema.projects);
      const [row] = await tx
        .insert(schema.projects)
        .values({ ...columnsFrom(input), status: "draft", sortOrder: next, createdBy: actor.id, updatedBy: actor.id })
        .returning({ id: schema.projects.id, version: schema.projects.version });
      await writeImages(tx, row.id, input);
      await syncUsages(tx, row.id, input, null);
      await audit({ actor, action: "project.created", resourceType: "project", resourceId: row.id, summary: `Criou o projeto ${input.name}`, ...ctx }, tx);
      return row;
    });
  } catch (error) {
    translateDbError(error);
  }
}

export async function updateProject(actor: Actor, id: string, input: ProjectInput, expectedVersion: number, ctx: Ctx) {
  let result: { version: number; featuredChanged: boolean };
  try {
    result = await getDb().transaction(async (tx) => {
      const current = await lockProject(tx, id, expectedVersion);
      if (current.slug !== input.slug) await assertSlugAvailable(tx, input.slug, id);
      const before = toInput(current, await loadImages(tx, id));
      const changes = diff(before, input);

      const [row] = await tx
        .update(schema.projects)
        .set({ ...columnsFrom(input), updatedBy: actor.id, updatedAt: new Date(), version: sql`${schema.projects.version} + 1` })
        .where(eq(schema.projects.id, id))
        .returning({ version: schema.projects.version });
      await writeImages(tx, id, input);
      await syncUsages(tx, id, input, current.publishedSnapshot as ProjectSnapshot | null);
      if (Object.keys(changes).length > 0) {
        await audit({ actor, action: "project.updated", resourceType: "project", resourceId: id, summary: `Editou o projeto ${input.name}`, changes, ...ctx }, tx);
      }
      // "Destaque" é organização da vitrine: vale na hora para projetos publicados.
      return { version: row.version, featuredChanged: before.featured !== input.featured && current.status === "published" };
    });
  } catch (error) {
    translateDbError(error);
  }
  if (result.featuredChanged) invalidate(CACHE_TAGS.projects);
  return { version: result.version };
}

/** O mínimo para uma página de projeto que não fique vazia: resumo e pelo menos uma imagem. */
function assertPublishable(input: ProjectInput) {
  const fields: Record<string, string> = {};
  if (!input.coverMediaId && !input.desktopMediaId && input.phoneMediaIds.length === 0) {
    fields.coverMediaId = "Escolha uma capa ou uma tela antes de publicar.";
  }
  // A cor da marca é usada de forma controlada: o texto sobre ela precisa ser legível (WCAG AA, 4,5:1).
  const text = input.tone === "light" ? "#ffffff" : "#0a0a0b";
  if (contrastRatio(input.brandColor, text) < 4.5) {
    fields.tone = "O texto fica ilegível sobre a cor da marca. Troque o tom do texto ou a cor.";
  }
  if (Object.keys(fields).length) throw new HttpError(422, "not_publishable", "Faltam ajustes para publicar.", { fields });
}

export function buildSnapshot(row: ProjectRow, input: ProjectInput): ProjectSnapshot {
  return {
    slug: input.slug,
    name: input.name,
    client: input.client,
    category: input.category,
    projectDate: input.projectDate,
    summary: input.summary,
    description: input.description,
    context: input.context,
    solution: input.solution,
    results: input.results,
    services: input.services,
    highlights: input.highlights,
    theme: { bg: input.brandColor, accent: input.accentColor, tone: input.tone },
    coverMediaId: input.coverMediaId,
    logoMediaId: input.logoMediaId,
    ogMediaId: input.ogMediaId,
    desktopMediaId: input.desktopMediaId,
    phoneMediaIds: input.phoneMediaIds,
    gallery: input.gallery,
    externalUrl: input.externalUrl,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    sample: row.isSample,
  };
}

function projectTags(...slugs: (string | null | undefined)[]) {
  return [CACHE_TAGS.projects, ...[...new Set(slugs.filter(Boolean) as string[])].map(CACHE_TAGS.project)];
}

export async function publishProject(actor: Actor, id: string, expectedVersion: number, ctx: Ctx) {
  let slugs: string[] = [];
  try {
    const result = await getDb().transaction(async (tx) => {
      const current = await lockProject(tx, id, expectedVersion);
      if (current.status === "archived") throw conflict("Restaure o projeto antes de publicar.", "archived");
      const input = toInput(current, await loadImages(tx, id));
      assertPublishable(input);
      await assertSlugAvailable(tx, input.slug, id);

      const previous = current.publishedSnapshot as ProjectSnapshot | null;
      const snapshot = buildSnapshot(current, input);
      const now = new Date();
      const [row] = await tx
        .update(schema.projects)
        .set({ status: "published", publishedSnapshot: snapshot, publishedAt: now, publishedBy: actor.id, updatedAt: now, version: sql`${schema.projects.version} + 1` })
        .where(eq(schema.projects.id, id))
        .returning({ version: schema.projects.version });
      await syncUsages(tx, id, input, snapshot);
      await audit(
        {
          actor,
          action: previous ? "project.republished" : "project.published",
          resourceType: "project",
          resourceId: id,
          summary: previous ? `Publicou alterações do projeto ${input.name}` : `Publicou o projeto ${input.name}`,
          changes: diff(previous ?? {}, snapshot),
          ...ctx,
        },
        tx,
      );
      slugs = [previous?.slug ?? "", snapshot.slug];
      return { version: row.version, slug: snapshot.slug };
    });
    invalidate(...projectTags(...slugs));
    return result;
  } catch (error) {
    translateDbError(error);
  }
}

/** Tira o projeto do ar (volta a rascunho) ou arquiva. Nos dois casos o snapshot é apagado. */
async function takeDown(actor: Actor, id: string, expectedVersion: number, target: "draft" | "archived", ctx: Ctx) {
  let slug: string | null = null;
  const result = await getDb().transaction(async (tx) => {
    const current = await lockProject(tx, id, expectedVersion);
    if (target === "draft" && current.status !== "published") throw conflict("O projeto não está publicado.", "not_published");
    if (target === "archived" && current.status === "archived") throw conflict("O projeto já está arquivado.", "already_archived");
    slug = (current.publishedSnapshot as ProjectSnapshot | null)?.slug ?? null;

    const [row] = await tx
      .update(schema.projects)
      .set({ status: target, publishedSnapshot: null, publishedAt: null, publishedBy: null, updatedAt: new Date(), version: sql`${schema.projects.version} + 1` })
      .where(eq(schema.projects.id, id))
      .returning({ version: schema.projects.version });
    await syncUsages(tx, id, toInput(current, await loadImages(tx, id)), null);
    await audit(
      {
        actor,
        action: target === "draft" ? "project.unpublished" : "project.archived",
        resourceType: "project",
        resourceId: id,
        summary: target === "draft" ? `Despublicou o projeto ${current.name}` : `Arquivou o projeto ${current.name}`,
        changes: { status: { before: current.status, after: target } },
        ...ctx,
      },
      tx,
    );
    return { version: row.version };
  });
  if (slug) invalidate(...projectTags(slug));
  return result;
}

export const unpublishProject = (actor: Actor, id: string, version: number, ctx: Ctx) => takeDown(actor, id, version, "draft", ctx);
export const archiveProject = (actor: Actor, id: string, version: number, ctx: Ctx) => takeDown(actor, id, version, "archived", ctx);

export async function restoreProject(actor: Actor, id: string, expectedVersion: number, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    const current = await lockProject(tx, id, expectedVersion);
    if (current.status !== "archived") throw conflict("Só projetos arquivados podem ser restaurados.", "not_archived");
    const [row] = await tx
      .update(schema.projects)
      .set({ status: "draft", updatedAt: new Date(), version: sql`${schema.projects.version} + 1` })
      .where(eq(schema.projects.id, id))
      .returning({ version: schema.projects.version });
    await audit(
      { actor, action: "project.restored", resourceType: "project", resourceId: id, summary: `Restaurou o projeto ${current.name} como rascunho`, changes: { status: { before: "archived", after: "draft" } }, ...ctx },
      tx,
    );
    return { version: row.version };
  });
}

/** Exclusão definitiva: só de projetos arquivados e com o endereço digitado como confirmação. */
export async function deleteProject(actor: Actor, id: string, expectedVersion: number, confirmSlug: string, ctx: Ctx) {
  await getDb().transaction(async (tx) => {
    const current = await lockProject(tx, id, expectedVersion);
    if (current.status !== "archived") throw conflict("Arquive o projeto antes de excluir.", "not_archived");
    if (confirmSlug.trim() !== current.slug) {
      throw new HttpError(422, "confirmation_mismatch", "Digite o endereço do projeto para confirmar.", { fields: { confirmSlug: "O endereço não confere." } });
    }
    await syncMediaUsages(tx, "project", id, []);
    await tx.delete(schema.projects).where(eq(schema.projects.id, id));
    await audit(
      { actor, action: "project.deleted", resourceType: "project", resourceId: id, summary: `Excluiu definitivamente o projeto ${current.name}`, changes: { name: { before: current.name, after: null }, slug: { before: current.slug, after: null } }, ...ctx },
      tx,
    );
  });
}

export async function duplicateProject(actor: Actor, id: string, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    const current = await lockProject(tx, id);
    const input = toInput(current, await loadImages(tx, id));

    const base = slugify(`${current.slug}-copia`).slice(0, 54);
    const existing = await tx
      .select({ slug: schema.projects.slug })
      .from(schema.projects)
      .where(sql`${schema.projects.slug} = ${base} OR ${schema.projects.slug} LIKE ${`${base}-%`}`);
    const taken = new Set(existing.map((r) => r.slug));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

    const copy: ProjectInput = { ...input, slug, name: `${input.name} (cópia)`.slice(0, 80), featured: false };
    const [{ next }] = await tx.select({ next: sql<number>`coalesce(max(${schema.projects.sortOrder}), 0) + 1` }).from(schema.projects);
    const [row] = await tx
      .insert(schema.projects)
      .values({ ...columnsFrom(copy), status: "draft", isSample: current.isSample, sortOrder: next, createdBy: actor.id, updatedBy: actor.id })
      .returning({ id: schema.projects.id });
    await writeImages(tx, row.id, copy);
    await syncUsages(tx, row.id, copy, null);
    await audit(
      { actor, action: "project.duplicated", resourceType: "project", resourceId: row.id, summary: `Duplicou o projeto ${current.name}`, changes: { origem: { before: null, after: current.slug } }, ...ctx },
      tx,
    );
    return { id: row.id, slug };
  });
}

/** Define a ordem da vitrine. Vale na hora para os projetos publicados. */
export async function reorderProjects(actor: Actor, ids: string[], ctx: Ctx) {
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) throw new HttpError(422, "duplicate_ids", "Lista de projetos repetida.");
  await getDb().transaction(async (tx) => {
    const found = await tx.select({ id: schema.projects.id }).from(schema.projects).where(inArray(schema.projects.id, unique)).for("update");
    if (found.length !== unique.length) throw notFound("Um dos projetos não existe mais. Recarregue a lista.");
    for (const [i, id] of unique.entries()) {
      await tx.update(schema.projects).set({ sortOrder: i + 1 }).where(eq(schema.projects.id, id));
    }
    await audit({ actor, action: "project.reordered", resourceType: "project", summary: "Reordenou os projetos", ...ctx }, tx);
  });
  invalidate(CACHE_TAGS.projects);
}

/** Destaque liga e desliga direto da lista, sem abrir o editor. */
export async function setFeatured(actor: Actor, id: string, featured: boolean, ctx: Ctx) {
  const result = await getDb().transaction(async (tx) => {
    const current = await lockProject(tx, id);
    if (current.featured === featured) return { version: current.version, status: current.status };
    const [row] = await tx
      .update(schema.projects)
      .set({ featured, version: sql`${schema.projects.version} + 1` })
      .where(eq(schema.projects.id, id))
      .returning({ version: schema.projects.version });
    await audit(
      { actor, action: "project.featured", resourceType: "project", resourceId: id, summary: featured ? `Destacou o projeto ${current.name}` : `Tirou o destaque do projeto ${current.name}`, changes: { featured: { before: !featured, after: featured } }, ...ctx },
      tx,
    );
    return { version: row.version, status: current.status };
  });
  if (result.status === "published") invalidate(CACHE_TAGS.projects);
  return { version: result.version };
}

export { projectTags };
