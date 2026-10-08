import "server-only";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema, type Tx } from "@/server/db";
import { audit, diff } from "@/server/audit";
import { invalidate } from "@/server/cache";
import { conflict, HttpError, notFound } from "@/server/http/errors";
import { isUuid, syncMediaUsages, type MediaRef } from "@/server/media/service";
import { TIERS, type PartnerStatus, type TierKey } from "@/lib/alliance/constants";
import { defaultPartnerPage, partnerPageSchema, type PartnerPageContent } from "@/lib/alliance/page-blocks";
import type { PartnerSnapshot } from "@/lib/alliance/types";
import { partnerSelfEditSchema, type PartnerInput, type PartnerSelfEdit } from "@/lib/alliance/validation";
import { notifyPartner } from "./notify";
import { ALLIANCE_TAGS } from "./tags";
import { pgError } from "./db-errors";

type Actor = { id: string; email: string };
type Ctx = { ip: string | null; userAgent: string | null };
type PartnerRow = typeof schema.partners.$inferSelect;

/**
 * Parceiros do Rocket Alliance.
 *
 * - O formulário edita a cópia de trabalho. O site lê só `published_snapshot` (diretório e página).
 * - Publicar exige situação ativa ou em onboarding e congela perfil + página + galeria + projetos.
 * - Suspender ou encerrar tira do ar e encerra as sessões do Hub da empresa.
 * - Toda gravação confere a `version` aberta na tela (409 se outra pessoa salvou antes).
 */

/* -------------------------------------------------------------------------- */
/* Leitura                                                                     */
/* -------------------------------------------------------------------------- */

export type PartnerSort = "directory" | "name" | "referrals" | "login" | "recent";

/**
 * Parceiros para as listas do Studio. Além do cadastro, traz o que ajuda a decidir: indicações em
 * andamento, contrato, último acesso ao Hub e se há algo esperando a equipe. Valores de comissão só
 * com `finance` (a soma nem é calculada sem a permissão).
 */
export async function listPartners(input: { q?: string; status?: PartnerStatus; tier?: TierKey; pending?: boolean; sort?: PartnerSort; finance?: boolean } = {}) {
  const where: SQL[] = [];
  if (input.status) where.push(eq(schema.partners.status, input.status));
  if (input.tier) where.push(eq(schema.partners.tierKey, input.tier));
  const q = input.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(schema.partners.tradeName, pattern), ilike(schema.partners.legalName, pattern), ilike(schema.partners.slug, pattern), ilike(schema.partners.contactEmail, pattern))!);
  }
  const id = schema.partners.id;
  const modalities = sql<string[]>`coalesce((select array_agg(l.modality_key order by l.modality_key) from partner_modality_links l where l.partner_id = ${id}), '{}')`;
  const users = sql<number>`(select count(*)::int from partner_users u where u.partner_id = ${id} and u.status = 'active')`;
  const openReferrals = sql<number>`(select count(*)::int from referrals r where r.partner_id = ${id} and r.status in ('submitted', 'under_review', 'qualified', 'in_negotiation'))`;
  const newReferrals = sql<number>`(select count(*)::int from referrals r where r.partner_id = ${id} and r.status = 'submitted')`;
  const lastLoginAt = sql<Date | null>`(select max(u.last_login_at) from partner_users u where u.partner_id = ${id})`.mapWith(schema.partnerUsers.lastLoginAt);
  // Melhor situação de contrato: vigente > aguardando aceite > rascunho > nenhum.
  const contract = sql<string | null>`(select c.status from partner_contracts c where c.partner_id = ${id} and c.status in ('active', 'sent', 'draft')
    order by case c.status when 'active' then 0 when 'sent' then 1 else 2 end limit 1)`;
  const pendingCount = sql<number>`(
    (select count(*) from referrals r where r.partner_id = ${id} and r.status = 'submitted')
    + (select count(*) from partner_change_requests c where c.partner_id = ${id} and c.status = 'pending')
    + (select count(*) from support_tickets t where t.partner_id = ${id} and t.status = 'open')
    + (select count(*) from partner_contracts c where c.partner_id = ${id} and c.status = 'sent')
    + (case when ${schema.partners.status} in ('active', 'onboarding') and not exists (select 1 from partner_users u where u.partner_id = ${id} and u.status = 'active') then 1 else 0 end)
  )::int`;
  const toPay = input.finance ? sql<number>`(select coalesce(sum(e.amount_cents), 0)::bigint from commission_entries e where e.partner_id = ${id} and e.status in ('pending', 'approved'))`.mapWith(Number) : sql<number | null>`null`;
  if (input.pending) where.push(sql`${pendingCount} > 0`);
  const order = {
    directory: [desc(schema.partners.featured), asc(schema.partners.sortOrder), asc(schema.partners.tradeName)],
    name: [asc(schema.partners.tradeName)],
    referrals: [sql`${openReferrals} desc`, asc(schema.partners.tradeName)],
    login: [sql`${lastLoginAt} desc nulls last`, asc(schema.partners.tradeName)],
    recent: [desc(schema.partners.createdAt)],
  }[input.sort ?? "directory"];
  return getDb()
    .select({
      id,
      slug: schema.partners.slug,
      tradeName: schema.partners.tradeName,
      status: schema.partners.status,
      tierKey: schema.partners.tierKey,
      sector: schema.partners.sector,
      directoryEnabled: schema.partners.directoryEnabled,
      featured: schema.partners.featured,
      sortOrder: schema.partners.sortOrder,
      published: sql<boolean>`${schema.partners.publishedSnapshot} IS NOT NULL`,
      hasChanges: sql<boolean>`(${schema.partners.publishedSnapshot} IS NOT NULL AND ${schema.partners.updatedAt} > ${schema.partners.publishedAt})`,
      updatedAt: schema.partners.updatedAt,
      logoUrl: schema.media.url,
      modalities,
      users,
      openReferrals,
      newReferrals,
      lastLoginAt,
      contract,
      pendingCount,
      toPayCents: toPay,
    })
    .from(schema.partners)
    .leftJoin(schema.media, eq(schema.media.id, schema.partners.logoMediaId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(...order);
}

export async function partnerOptions() {
  return getDb().select({ id: schema.partners.id, tradeName: schema.partners.tradeName, status: schema.partners.status }).from(schema.partners).orderBy(asc(schema.partners.tradeName));
}

async function loadRelations(runner: Tx | ReturnType<typeof getDb>, id: string) {
  const [modalities, gallery, projects, page] = await Promise.all([
    runner.select({ key: schema.partnerModalityLinks.modalityKey }).from(schema.partnerModalityLinks).where(eq(schema.partnerModalityLinks.partnerId, id)),
    runner.select().from(schema.partnerMedia).where(eq(schema.partnerMedia.partnerId, id)).orderBy(asc(schema.partnerMedia.position)),
    runner.select().from(schema.partnerProjects).where(eq(schema.partnerProjects.partnerId, id)).orderBy(asc(schema.partnerProjects.position)),
    runner.select().from(schema.partnerPages).where(eq(schema.partnerPages.partnerId, id)),
  ]);
  const parsedPage = page[0] ? partnerPageSchema.safeParse(page[0].content) : null;
  return {
    modalities: modalities.map((m) => m.key).sort(),
    gallery: gallery.map((g) => ({ mediaId: g.mediaId, caption: g.caption })),
    projectIds: projects.map((p) => p.projectId),
    page: parsedPage?.success ? parsedPage.data : defaultPartnerPage(),
    pageUpdatedAt: page[0]?.updatedAt ?? null,
  };
}

export function toPartnerInput(row: PartnerRow, rel: { modalities: string[]; gallery: { mediaId: string; caption: string }[]; projectIds: string[] }): PartnerInput {
  return {
    tradeName: row.tradeName,
    legalName: row.legalName,
    taxId: row.taxId,
    slug: row.slug,
    status: row.status as PartnerStatus,
    tierKey: row.tierKey as TierKey,
    modalities: rel.modalities as PartnerInput["modalities"],
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    sector: row.sector,
    shortDescription: row.shortDescription,
    description: row.description,
    specialties: row.specialties,
    services: row.services,
    websiteUrl: row.websiteUrl,
    socialLinks: row.socialLinks,
    location: row.location,
    logoMediaId: row.logoMediaId,
    logoAltMediaId: row.logoAltMediaId,
    coverMediaId: row.coverMediaId,
    ogMediaId: row.ogMediaId,
    accentColor: row.accentColor,
    gallery: rel.gallery,
    projectIds: rel.projectIds,
    testimonials: row.testimonials,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    showTier: row.showTier,
    managersInvite: row.managersInvite,
    qualityScore: row.qualityScore,
    satisfactionScore: row.satisfactionScore,
    complianceOk: row.complianceOk,
    internalNotes: row.internalNotes,
  };
}

export async function getPartner(id: string) {
  if (!isUuid(id)) return null;
  const db = getDb();
  const [row] = await db.select().from(schema.partners).where(eq(schema.partners.id, id));
  if (!row) return null;
  const rel = await loadRelations(db, id);
  return {
    row,
    input: toPartnerInput(row, rel),
    page: rel.page,
    published: row.publishedSnapshot !== null,
    hasChanges: row.publishedSnapshot !== null && row.publishedAt !== null && (row.updatedAt > row.publishedAt || (rel.pageUpdatedAt !== null && rel.pageUpdatedAt > row.publishedAt)),
  };
}

/* -------------------------------------------------------------------------- */
/* Escrita                                                                     */
/* -------------------------------------------------------------------------- */

/** Colunas da tabela `partners` (modalidades, galeria e projetos ficam em tabelas próprias). */
function columnsFrom(input: PartnerInput) {
  const columns: Partial<PartnerInput> = { ...input };
  delete columns.modalities;
  delete columns.gallery;
  delete columns.projectIds;
  return columns as Omit<PartnerInput, "modalities" | "gallery" | "projectIds">;
}

function mediaRefs(name: string, input: Pick<PartnerInput, "logoMediaId" | "logoAltMediaId" | "coverMediaId" | "ogMediaId" | "gallery">, state: string, prefix: string): MediaRef[] {
  const refs: MediaRef[] = [];
  const push = (mediaId: string | null, field: string, label: string) => mediaId && refs.push({ mediaId, field: `${prefix}:${field}`, label: `Parceiro ${name} · ${label} (${state})` });
  push(input.logoMediaId, "logo", "Logo");
  push(input.logoAltMediaId, "logo-alt", "Logo alternativo");
  push(input.coverMediaId, "cover", "Capa");
  push(input.ogMediaId, "og", "Imagem de compartilhamento");
  input.gallery.forEach((g, i) => push(g.mediaId, `gallery.${i}`, `Galeria ${i + 1}`));
  return refs;
}

async function syncUsages(tx: Tx, id: string, input: PartnerInput, snapshot: PartnerSnapshot | null) {
  await syncMediaUsages(tx, "partner", id, [
    ...mediaRefs(input.tradeName, input, "rascunho", "draft"),
    ...(snapshot ? mediaRefs(snapshot.tradeName, snapshot, "publicado", "published") : []),
  ]);
}

async function writeRelations(tx: Tx, id: string, input: PartnerInput, actor: Actor) {
  const current = await tx.select({ key: schema.partnerModalityLinks.modalityKey }).from(schema.partnerModalityLinks).where(eq(schema.partnerModalityLinks.partnerId, id));
  const keep = new Set(input.modalities);
  const removed = current.filter((c) => !keep.has(c.key as never)).map((c) => c.key);
  if (removed.length) await tx.delete(schema.partnerModalityLinks).where(and(eq(schema.partnerModalityLinks.partnerId, id), inArray(schema.partnerModalityLinks.modalityKey, removed)));
  const added = input.modalities.filter((m) => !current.some((c) => c.key === m));
  if (added.length) await tx.insert(schema.partnerModalityLinks).values(added.map((modalityKey) => ({ partnerId: id, modalityKey, approvedBy: actor.id })));

  await tx.delete(schema.partnerMedia).where(eq(schema.partnerMedia.partnerId, id));
  if (input.gallery.length) await tx.insert(schema.partnerMedia).values(input.gallery.map((g, position) => ({ partnerId: id, mediaId: g.mediaId, caption: g.caption, position })));

  await tx.delete(schema.partnerProjects).where(eq(schema.partnerProjects.partnerId, id));
  const projectIds = [...new Set(input.projectIds)];
  if (projectIds.length) {
    const found = await tx.select({ id: schema.projects.id }).from(schema.projects).where(inArray(schema.projects.id, projectIds));
    if (found.length !== projectIds.length) throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { projectIds: "Um dos projetos escolhidos não existe mais." } });
    await tx.insert(schema.partnerProjects).values(projectIds.map((projectId, position) => ({ partnerId: id, projectId, position })));
  }
}

async function assertSlugAvailable(tx: Tx, slug: string, exceptId?: string) {
  const [taken] = await tx
    .select({ id: schema.partners.id })
    .from(schema.partners)
    .where(and(or(eq(schema.partners.slug, slug), sql`${schema.partners.publishedSnapshot} ->> 'slug' = ${slug}`), exceptId ? ne(schema.partners.id, exceptId) : undefined))
    .limit(1);
  if (taken) throw new HttpError(409, "slug_taken", "Já existe um parceiro com este endereço.", { fields: { slug: "Este endereço já está em uso. Escolha outro." } });
}

function translateDbError(error: unknown): never {
  const { code, constraint = "" } = pgError(error);
  if (code === "23505" && constraint.includes("slug")) throw new HttpError(409, "slug_taken", "Já existe um parceiro com este endereço.", { fields: { slug: "Este endereço já está em uso. Escolha outro." } });
  if (code === "23503" && constraint.includes("media")) throw new HttpError(422, "media_missing", "Uma das imagens escolhidas foi removida da biblioteca. Escolha outra.");
  throw error;
}

async function lockPartner(tx: Tx, id: string, expectedVersion?: number) {
  if (!isUuid(id)) throw notFound("Parceiro não encontrado.");
  const [row] = await tx.select().from(schema.partners).where(eq(schema.partners.id, id)).for("update");
  if (!row) throw notFound("Parceiro não encontrado.");
  if (expectedVersion !== undefined && row.version !== expectedVersion) {
    throw conflict("Este parceiro foi alterado por outra pessoa desde que você abriu. Recarregue para ver a versão atual.", "stale");
  }
  return row;
}

/** Cadastro manual (sem candidatura): começa em onboarding, sem publicação e sem acesso ao Hub. */
export async function createPartner(actor: Actor, input: PartnerInput, ctx: Ctx) {
  try {
    return await getDb().transaction(async (tx) => {
      await assertSlugAvailable(tx, input.slug);
      const [row] = await tx
        .insert(schema.partners)
        .values({ ...columnsFrom(input), directoryEnabled: false, createdBy: actor.id, updatedBy: actor.id })
        .returning({ id: schema.partners.id, version: schema.partners.version });
      await writeRelations(tx, row.id, input, actor);
      await tx.insert(schema.partnerPages).values({ partnerId: row.id, content: defaultPartnerPage(), updatedBy: actor.id });
      await syncUsages(tx, row.id, input, null);
      await audit({ actor, action: "alliance.partner.created", resourceType: "partner", resourceId: row.id, summary: `Cadastrou o parceiro ${input.tradeName}`, ...ctx }, tx);
      return row;
    });
  } catch (error) {
    translateDbError(error);
  }
}

export async function updatePartner(actor: Actor, id: string, input: PartnerInput, expectedVersion: number, ctx: Ctx) {
  let effects: { tierChanged: TierKey | null; closed: boolean; slug: string | null; wasPublished: boolean } = { tierChanged: null, closed: false, slug: null, wasPublished: false };
  let version: number;
  try {
    version = await getDb().transaction(async (tx) => {
      const current = await lockPartner(tx, id, expectedVersion);
      if (current.slug !== input.slug) await assertSlugAvailable(tx, input.slug, id);
      const before = toPartnerInput(current, await loadRelations(tx, id));
      const changes = diff(before, input);
      const closing = (input.status === "suspended" || input.status === "terminated") && current.status !== input.status;
      const snapshot = closing ? null : (current.publishedSnapshot as PartnerSnapshot | null);

      const [row] = await tx
        .update(schema.partners)
        .set({
          ...columnsFrom(input),
          ...(closing && { publishedSnapshot: null, publishedAt: null, directoryEnabled: false }),
          updatedBy: actor.id,
          updatedAt: new Date(),
          version: sql`${schema.partners.version} + 1`,
        })
        .where(eq(schema.partners.id, id))
        .returning({ version: schema.partners.version });
      await writeRelations(tx, id, input, actor);
      await syncUsages(tx, id, input, snapshot);

      if (closing) {
        // Empresa suspensa ou encerrada: ninguém dela continua logado no Hub.
        const people = tx.select({ id: schema.partnerUsers.id }).from(schema.partnerUsers).where(eq(schema.partnerUsers.partnerId, id));
        await tx.delete(schema.partnerSessions).where(inArray(schema.partnerSessions.partnerUserId, people));
      }
      if (Object.keys(changes).length > 0) {
        await audit({ actor, action: "alliance.partner.updated", resourceType: "partner", resourceId: id, summary: `Editou o parceiro ${input.tradeName}`, changes, ...ctx }, tx);
      }
      effects = {
        tierChanged: before.tierKey !== input.tierKey ? input.tierKey : null,
        closed: closing,
        slug: (current.publishedSnapshot as PartnerSnapshot | null)?.slug ?? null,
        wasPublished: current.publishedSnapshot !== null,
      };
      return row.version;
    });
  } catch (error) {
    translateDbError(error);
  }

  if (effects.closed && effects.wasPublished) invalidate(ALLIANCE_TAGS.directory, ...(effects.slug ? [ALLIANCE_TAGS.partner(effects.slug)] : []));
  if (effects.tierChanged) await announceTier(id, effects.tierChanged);
  return { version };
}

/** Salva o conteúdo em blocos da página exclusiva. O site não muda até publicar. */
export async function savePartnerPage(actor: Actor, id: string, content: PartnerPageContent, expectedVersion: number, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    const current = await lockPartner(tx, id, expectedVersion);
    const [before] = await tx.select().from(schema.partnerPages).where(eq(schema.partnerPages.partnerId, id));
    await tx
      .insert(schema.partnerPages)
      .values({ partnerId: id, content, updatedBy: actor.id })
      .onConflictDoUpdate({ target: schema.partnerPages.partnerId, set: { content, updatedBy: actor.id, updatedAt: new Date() } });
    const [row] = await tx
      .update(schema.partners)
      .set({ updatedAt: new Date(), updatedBy: actor.id, version: sql`${schema.partners.version} + 1` })
      .where(eq(schema.partners.id, id))
      .returning({ version: schema.partners.version });
    const changes = diff(before?.content ?? null, content);
    if (Object.keys(changes).length > 0) {
      await audit({ actor, action: "alliance.page.updated", resourceType: "partner", resourceId: id, summary: `Editou a página exclusiva de ${current.tradeName}`, changes, ...ctx }, tx);
    }
    return { version: row.version };
  });
}

/* -------------------------------------------------------------------------- */
/* Publicação                                                                  */
/* -------------------------------------------------------------------------- */

export function buildPartnerSnapshot(input: PartnerInput, page: PartnerPageContent): PartnerSnapshot {
  return {
    slug: input.slug,
    tradeName: input.tradeName,
    sector: input.sector,
    shortDescription: input.shortDescription,
    description: input.description,
    specialties: input.specialties,
    services: input.services,
    websiteUrl: input.websiteUrl,
    socialLinks: input.socialLinks,
    location: input.location,
    logoMediaId: input.logoMediaId,
    logoAltMediaId: input.logoAltMediaId,
    coverMediaId: input.coverMediaId,
    ogMediaId: input.ogMediaId,
    accentColor: input.accentColor,
    modalities: input.modalities,
    tierKey: input.showTier ? input.tierKey : null,
    // Só depoimentos aprovados vão para o site.
    testimonials: input.testimonials.filter((t) => t.approved).map(({ quote, author, role }) => ({ quote, author, role })),
    gallery: input.gallery,
    projectIds: input.projectIds,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    page,
  };
}

/** O mínimo para o parceiro aparecer bem no diretório e ter uma página que não fique vazia. */
function assertPublishable(row: PartnerRow, input: PartnerInput) {
  const fields: Record<string, string> = {};
  if (row.status !== "active" && row.status !== "onboarding") fields.status = "Só parceiros ativos ou em onboarding podem ser publicados.";
  if (!input.logoMediaId) fields.logoMediaId = "Escolha o logotipo antes de publicar.";
  if (!input.shortDescription) fields.shortDescription = "Escreva a descrição curta antes de publicar.";
  if (!input.websiteUrl) fields.websiteUrl = "Informe o site oficial antes de publicar.";
  if (Object.keys(fields).length) throw new HttpError(422, "not_publishable", "Faltam ajustes para publicar.", { fields });
}

export async function publishPartner(actor: Actor, id: string, expectedVersion: number, ctx: Ctx) {
  let slugs: string[] = [];
  try {
    const result = await getDb().transaction(async (tx) => {
      const current = await lockPartner(tx, id, expectedVersion);
      const rel = await loadRelations(tx, id);
      const input = toPartnerInput(current, rel);
      assertPublishable(current, input);
      await assertSlugAvailable(tx, input.slug, id);
      const previous = current.publishedSnapshot as PartnerSnapshot | null;
      const snapshot = buildPartnerSnapshot(input, rel.page);
      const now = new Date();
      const [row] = await tx
        .update(schema.partners)
        .set({ publishedSnapshot: snapshot, publishedAt: now, publishedBy: actor.id, directoryEnabled: true, updatedAt: now, version: sql`${schema.partners.version} + 1` })
        .where(eq(schema.partners.id, id))
        .returning({ version: schema.partners.version });
      await syncUsages(tx, id, input, snapshot);
      await audit(
        {
          actor,
          action: previous ? "alliance.partner.republished" : "alliance.partner.published",
          resourceType: "partner",
          resourceId: id,
          summary: previous ? `Publicou alterações de ${input.tradeName}` : `Publicou ${input.tradeName} no diretório`,
          changes: diff(previous ?? {}, snapshot),
          ...ctx,
        },
        tx,
      );
      slugs = [previous?.slug ?? "", snapshot.slug].filter(Boolean);
      return { version: row.version, slug: snapshot.slug };
    });
    invalidate(ALLIANCE_TAGS.directory, ...slugs.map(ALLIANCE_TAGS.partner));
    return result;
  } catch (error) {
    translateDbError(error);
  }
}

/** Tira do diretório e da página exclusiva (a URL passa a responder 404). */
export async function unpublishPartner(actor: Actor, id: string, expectedVersion: number, ctx: Ctx) {
  let slug: string | null = null;
  const result = await getDb().transaction(async (tx) => {
    const current = await lockPartner(tx, id, expectedVersion);
    if (!current.publishedSnapshot) throw conflict("Este parceiro não está publicado.", "not_published");
    slug = (current.publishedSnapshot as PartnerSnapshot).slug;
    const [row] = await tx
      .update(schema.partners)
      .set({ publishedSnapshot: null, publishedAt: null, publishedBy: null, directoryEnabled: false, updatedAt: new Date(), version: sql`${schema.partners.version} + 1` })
      .where(eq(schema.partners.id, id))
      .returning({ version: schema.partners.version });
    await syncUsages(tx, id, toPartnerInput(current, await loadRelations(tx, id)), null);
    await audit({ actor, action: "alliance.partner.unpublished", resourceType: "partner", resourceId: id, summary: `Tirou ${current.tradeName} do diretório`, ...ctx }, tx);
    return { version: row.version };
  });
  invalidate(ALLIANCE_TAGS.directory, ...(slug ? [ALLIANCE_TAGS.partner(slug)] : []));
  return result;
}

/** Destaque e ordem do diretório: organização da vitrine, vale na hora para os publicados. */
export async function setFeatured(actor: Actor, id: string, featured: boolean, ctx: Ctx) {
  const [row] = await getDb().update(schema.partners).set({ featured }).where(eq(schema.partners.id, id)).returning({ tradeName: schema.partners.tradeName });
  if (!row) throw notFound("Parceiro não encontrado.");
  await audit({ actor, action: "alliance.partner.featured", resourceType: "partner", resourceId: id, summary: featured ? `Destacou ${row.tradeName} no diretório` : `Tirou o destaque de ${row.tradeName}`, ...ctx });
  invalidate(ALLIANCE_TAGS.directory);
}

export async function reorderDirectory(actor: Actor, ids: string[], ctx: Ctx) {
  await getDb().transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(schema.partners).set({ sortOrder: i + 1 }).where(eq(schema.partners.id, id));
    await audit({ actor, action: "alliance.directory.reordered", resourceType: "partner", resourceId: null, summary: "Reordenou o diretório de parceiros", ...ctx }, tx);
  });
  invalidate(ALLIANCE_TAGS.directory);
}

/* -------------------------------------------------------------------------- */
/* Nível                                                                       */
/* -------------------------------------------------------------------------- */

export async function changeTier(actor: Actor, id: string, tierKey: TierKey, reason: string, ctx: Ctx) {
  await getDb().transaction(async (tx) => {
    const current = await lockPartner(tx, id);
    if (current.tierKey === tierKey) throw conflict("O parceiro já está neste nível.", "same_tier");
    await tx.update(schema.partners).set({ tierKey, updatedAt: new Date(), updatedBy: actor.id, version: sql`${schema.partners.version} + 1` }).where(eq(schema.partners.id, id));
    await audit(
      {
        actor,
        action: "alliance.partner.tier_changed",
        resourceType: "partner",
        resourceId: id,
        summary: `Mudou ${current.tradeName} de ${TIERS[current.tierKey as TierKey]?.name ?? current.tierKey} para ${TIERS[tierKey].name}: ${reason}`,
        changes: { tierKey: { before: current.tierKey, after: tierKey } },
        ...ctx,
      },
      tx,
    );
  });
  await announceTier(id, tierKey);
}

async function announceTier(partnerId: string, tierKey: TierKey) {
  const [partner] = await getDb().select({ tradeName: schema.partners.tradeName }).from(schema.partners).where(eq(schema.partners.id, partnerId));
  const [tier] = await getDb().select().from(schema.partnerTiers).where(eq(schema.partnerTiers.key, tierKey));
  const name = tier?.name ?? TIERS[tierKey].name;
  await notifyPartner(
    partnerId,
    { type: "tier", title: `Novo nível: ${name}`, body: tier?.description ?? TIERS[tierKey].description, link: "/alliance" },
    { email: { template: "tier_changed", dedupeKey: `tier:${partnerId}:${tierKey}:${Date.now()}`, params: { company: partner?.tradeName ?? "", tier: name, description: tier?.description ?? "" } } },
  );
}

/* -------------------------------------------------------------------------- */
/* Pedidos de alteração enviados pelo Hub                                      */
/* -------------------------------------------------------------------------- */

export async function listChangeRequests(input: { status?: string; partnerId?: string } = {}) {
  const where: SQL[] = [];
  if (input.status) where.push(eq(schema.partnerChangeRequests.status, input.status));
  if (input.partnerId) where.push(eq(schema.partnerChangeRequests.partnerId, input.partnerId));
  return getDb()
    .select({
      id: schema.partnerChangeRequests.id,
      partnerId: schema.partnerChangeRequests.partnerId,
      partnerName: schema.partners.tradeName,
      changes: schema.partnerChangeRequests.changes,
      status: schema.partnerChangeRequests.status,
      reviewNote: schema.partnerChangeRequests.reviewNote,
      createdAt: schema.partnerChangeRequests.createdAt,
      reviewedAt: schema.partnerChangeRequests.reviewedAt,
      requestedByName: schema.partnerUsers.name,
    })
    .from(schema.partnerChangeRequests)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.partnerChangeRequests.partnerId))
    .leftJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.partnerChangeRequests.requestedBy))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.partnerChangeRequests.createdAt))
    .limit(100);
}

/**
 * Aprovar aplica o pedido na cópia de trabalho e, se o parceiro está publicado, publica de novo
 * (a mudança foi revisada pela Rocket, que é o que a aprovação garante).
 */
export async function decideChangeRequest(actor: Actor, requestId: string, action: "approve" | "reject", note: string, ctx: Ctx) {
  let republish: { id: string; version: number } | null = null;
  const result = await getDb().transaction(async (tx) => {
    const [request] = await tx.select().from(schema.partnerChangeRequests).where(eq(schema.partnerChangeRequests.id, requestId)).for("update");
    if (!request) throw notFound("Pedido não encontrado.");
    if (request.status !== "pending") throw conflict("Este pedido já foi decidido.", "already_decided");
    const current = await lockPartner(tx, request.partnerId);
    const now = new Date();
    await tx.update(schema.partnerChangeRequests).set({ status: action === "approve" ? "approved" : "rejected", reviewNote: note, reviewedBy: actor.id, reviewedAt: now }).where(eq(schema.partnerChangeRequests.id, requestId));

    if (action === "approve") {
      const parsed = partnerSelfEditSchema.safeParse(request.changes);
      if (!parsed.success) throw new HttpError(422, "invalid_request", "O pedido tem dados que não são mais válidos. Recuse e peça um novo envio.");
      const changes: PartnerSelfEdit = parsed.data;
      const [row] = await tx
        .update(schema.partners)
        .set({ ...changes, logoMediaId: changes.logoMediaId === undefined ? current.logoMediaId : changes.logoMediaId, updatedAt: now, updatedBy: actor.id, version: sql`${schema.partners.version} + 1` })
        .where(eq(schema.partners.id, current.id))
        .returning({ version: schema.partners.version });
      const rel = await loadRelations(tx, current.id);
      const [fresh] = await tx.select().from(schema.partners).where(eq(schema.partners.id, current.id));
      await syncUsages(tx, current.id, toPartnerInput(fresh, rel), fresh.publishedSnapshot as PartnerSnapshot | null);
      if (current.publishedSnapshot) republish = { id: current.id, version: row.version };
    }
    await audit(
      {
        actor,
        action: action === "approve" ? "alliance.change_request.approved" : "alliance.change_request.rejected",
        resourceType: "partner",
        resourceId: current.id,
        summary: action === "approve" ? `Aprovou alterações pedidas por ${current.tradeName}` : `Recusou alterações pedidas por ${current.tradeName}`,
        changes: action === "approve" ? diff(pick(current, Object.keys(request.changes as object)), request.changes) : null,
        ...ctx,
      },
      tx,
    );
    return { partnerId: current.id, requestedBy: request.requestedBy };
  });

  if (republish) await publishPartner(actor, (republish as { id: string }).id, (republish as { version: number }).version, ctx);
  await notifyPartner(
    result.partnerId,
    {
      type: "company",
      title: action === "approve" ? "Alterações aprovadas" : "Alterações não aprovadas",
      body: note || (action === "approve" ? "As alterações dos dados da empresa foram aprovadas." : "As alterações dos dados da empresa não foram aprovadas."),
      link: "/alliance/empresa",
    },
    { roles: ["owner", "manager"] },
  );
}

function pick(row: PartnerRow, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, (row as Record<string, unknown>)[k]]));
}
