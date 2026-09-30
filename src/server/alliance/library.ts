import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { getDb, schema } from "@/server/db";
import { audit, diff } from "@/server/audit";
import { cmsOrigin } from "@/server/env";
import { conflict, forbidden, notFound } from "@/server/http/errors";
import { hubCan, matchesAudience, type Audience } from "@/lib/alliance/constants";
import type { announcementInputSchema, opportunityInputSchema, resourceInputSchema } from "@/lib/alliance/validation";
import { deliver } from "./mail";
import { notifyPartner } from "./notify";
import { getProgramSettings } from "./settings";
import type { HubUser } from "./hub/session";

type Actor = { id: string; email: string };
type Ctx = { ip: string | null; userAgent: string | null };

/**
 * Conteúdo segmentado do Hub: materiais (recursos), oportunidades e comunicados.
 * Segmentação por nível mínimo, modalidades e empresas específicas. A elegibilidade é conferida no
 * servidor a cada leitura e a cada download (o Hub nunca recebe o que a empresa não pode ver).
 */

/** Dados da empresa da sessão para decidir a segmentação. */
export async function hubAudienceOf(user: HubUser) {
  const modalities = (await getDb().select({ key: schema.partnerModalityLinks.modalityKey }).from(schema.partnerModalityLinks).where(eq(schema.partnerModalityLinks.partnerId, user.partner.id))).map((m) => m.key);
  return { id: user.partner.id, tierKey: user.partner.tierKey, modalities };
}

const audienceOf = (row: { minTierRank: number; modalities: string[]; partnerIds: string[] }): Audience => ({ minTierRank: row.minTierRank, modalities: row.modalities, partnerIds: row.partnerIds });

/* -------------------------------------------------------------------------- */
/* Recursos                                                                    */
/* -------------------------------------------------------------------------- */

type ResourceInput = z.infer<typeof resourceInputSchema>;

export async function listResources() {
  return getDb()
    .select({ resource: schema.partnerResources, filename: schema.allianceFiles.filename, sizeBytes: schema.allianceFiles.sizeBytes })
    .from(schema.partnerResources)
    .leftJoin(schema.allianceFiles, eq(schema.allianceFiles.id, schema.partnerResources.fileId))
    .orderBy(asc(schema.partnerResources.category), asc(schema.partnerResources.sortOrder), desc(schema.partnerResources.createdAt));
}

export async function saveResource(actor: Actor, id: string | null, input: ResourceInput, ctx: Ctx) {
  const db = getDb();
  if (input.fileId) {
    const [file] = await db.select({ id: schema.allianceFiles.id }).from(schema.allianceFiles).where(eq(schema.allianceFiles.id, input.fileId));
    if (!file) throw notFound("Arquivo não encontrado. Envie de novo.");
  }
  if (!id) {
    const [row] = await db.insert(schema.partnerResources).values({ ...input, createdBy: actor.id }).returning({ id: schema.partnerResources.id });
    await audit({ actor, action: "alliance.resource.created", resourceType: "partner_resource", resourceId: row.id, summary: `Criou o material "${input.title}"`, ...ctx });
    return row;
  }
  const [before] = await db.select().from(schema.partnerResources).where(eq(schema.partnerResources.id, id));
  if (!before) throw notFound("Material não encontrado.");
  await db.update(schema.partnerResources).set({ ...input, updatedAt: new Date() }).where(eq(schema.partnerResources.id, id));
  await audit({ actor, action: "alliance.resource.updated", resourceType: "partner_resource", resourceId: id, summary: `Editou o material "${input.title}"`, changes: diff(before, { ...before, ...input }), ...ctx });
  return { id };
}

export async function deleteResource(actor: Actor, id: string, ctx: Ctx) {
  const [row] = await getDb().delete(schema.partnerResources).where(eq(schema.partnerResources.id, id)).returning({ title: schema.partnerResources.title });
  if (!row) throw notFound("Material não encontrado.");
  await audit({ actor, action: "alliance.resource.deleted", resourceType: "partner_resource", resourceId: id, summary: `Removeu o material "${row.title}"`, ...ctx });
}

export async function hubResources(user: HubUser) {
  const who = await hubAudienceOf(user);
  const rows = await getDb()
    .select({ resource: schema.partnerResources, filename: schema.allianceFiles.filename, sizeBytes: schema.allianceFiles.sizeBytes, mimeType: schema.allianceFiles.mimeType })
    .from(schema.partnerResources)
    .leftJoin(schema.allianceFiles, eq(schema.allianceFiles.id, schema.partnerResources.fileId))
    .where(eq(schema.partnerResources.status, "published"))
    .orderBy(asc(schema.partnerResources.category), asc(schema.partnerResources.sortOrder), desc(schema.partnerResources.createdAt));
  return rows
    .filter((r) => matchesAudience(audienceOf(r.resource), who))
    .map((r) => ({ id: r.resource.id, title: r.resource.title, description: r.resource.description, category: r.resource.category, url: r.resource.url, hasFile: r.resource.fileId !== null, filename: r.filename, sizeBytes: r.sizeBytes, mimeType: r.mimeType, updatedAt: r.resource.updatedAt }));
}

/** Arquivo de um material, só se a empresa da sessão pode vê-lo. Outra empresa: 404, como inexistente. */
export async function hubResourceFile(user: HubUser, id: string) {
  const [row] = await getDb().select().from(schema.partnerResources).where(and(eq(schema.partnerResources.id, id), eq(schema.partnerResources.status, "published")));
  if (!row?.fileId || !matchesAudience(audienceOf(row), await hubAudienceOf(user))) throw notFound("Material não encontrado.");
  return row.fileId;
}

/* -------------------------------------------------------------------------- */
/* Oportunidades                                                               */
/* -------------------------------------------------------------------------- */

type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export async function listOpportunities() {
  const interests = sql<number>`(select count(*)::int from opportunity_interests i where i.opportunity_id = ${schema.opportunities.id})`;
  return getDb().select({ opportunity: schema.opportunities, interests }).from(schema.opportunities).orderBy(desc(schema.opportunities.createdAt));
}

export async function getOpportunity(id: string) {
  const db = getDb();
  const [row] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, id));
  if (!row) return null;
  const interests = await db
    .select({ id: schema.opportunityInterests.id, message: schema.opportunityInterests.message, status: schema.opportunityInterests.status, createdAt: schema.opportunityInterests.createdAt, partnerId: schema.partners.id, partnerName: schema.partners.tradeName, personName: schema.partnerUsers.name })
    .from(schema.opportunityInterests)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.opportunityInterests.partnerId))
    .leftJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.opportunityInterests.partnerUserId))
    .where(eq(schema.opportunityInterests.opportunityId, id))
    .orderBy(asc(schema.opportunityInterests.createdAt));
  return { row, interests };
}

export async function saveOpportunity(actor: Actor, id: string | null, input: OpportunityInput, ctx: Ctx) {
  const db = getDb();
  const values = { ...input, deadline: input.deadline };
  if (!id) {
    const [row] = await db.insert(schema.opportunities).values({ ...values, createdBy: actor.id }).returning();
    await audit({ actor, action: "alliance.opportunity.created", resourceType: "opportunity", resourceId: row.id, summary: `Criou a oportunidade "${input.title}"`, ...ctx });
    if (row.status === "open") await announceOpportunity(row);
    return { id: row.id };
  }
  const [before] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, id));
  if (!before) throw notFound("Oportunidade não encontrada.");
  const [row] = await db.update(schema.opportunities).set({ ...values, updatedAt: new Date() }).where(eq(schema.opportunities.id, id)).returning();
  await audit({ actor, action: "alliance.opportunity.updated", resourceType: "opportunity", resourceId: id, summary: `Editou a oportunidade "${input.title}"`, changes: diff(before, row), ...ctx });
  if (before.status !== "open" && row.status === "open") await announceOpportunity(row);
  return { id };
}

/** Oportunidade aberta: aviso no Hub para as empresas elegíveis (owners e managers). */
async function announceOpportunity(row: typeof schema.opportunities.$inferSelect) {
  const partners = await eligiblePartners(audienceOf(row));
  for (const p of partners) {
    await notifyPartner(p, { type: "opportunity", title: `Nova oportunidade: ${row.title}`, body: row.summary, link: `/alliance/oportunidades#${row.id}` }, { roles: ["owner", "manager"] });
  }
}

async function eligiblePartners(audience: Audience) {
  const rows = await getDb()
    .select({ id: schema.partners.id, tierKey: schema.partners.tierKey, modalities: sql<string[]>`coalesce((select array_agg(l.modality_key) from partner_modality_links l where l.partner_id = ${schema.partners.id}), '{}')` })
    .from(schema.partners)
    .where(inArray(schema.partners.status, ["onboarding", "active"]));
  return rows.filter((p) => matchesAudience(audience, p)).map((p) => p.id);
}

export async function decideInterest(actor: Actor, interestId: string, status: "accepted" | "declined", ctx: Ctx) {
  const [row] = await getDb().update(schema.opportunityInterests).set({ status }).where(eq(schema.opportunityInterests.id, interestId)).returning();
  if (!row) throw notFound("Interesse não encontrado.");
  const [opp] = await getDb().select({ title: schema.opportunities.title }).from(schema.opportunities).where(eq(schema.opportunities.id, row.opportunityId));
  await audit({ actor, action: "alliance.opportunity.interest_decided", resourceType: "opportunity", resourceId: row.opportunityId, summary: `${status === "accepted" ? "Aceitou" : "Recusou"} o interesse na oportunidade "${opp?.title}"`, ...ctx });
  await notifyPartner(row.partnerId, { type: "opportunity", title: status === "accepted" ? `Interesse aceito: ${opp?.title}` : `Oportunidade: ${opp?.title}`, body: status === "accepted" ? "A equipe Rocket Vision vai falar com vocês sobre os próximos passos." : "Desta vez seguimos com outro caminho. Obrigado pelo interesse.", link: "/alliance/oportunidades" }, { roles: ["owner", "manager"] });
}

export async function hubOpportunities(user: HubUser) {
  const who = await hubAudienceOf(user);
  const db = getDb();
  const rows = await db.select().from(schema.opportunities).where(eq(schema.opportunities.status, "open")).orderBy(desc(schema.opportunities.createdAt));
  const visible = rows.filter((r) => matchesAudience(audienceOf(r), who));
  const mine = visible.length
    ? await db.select({ opportunityId: schema.opportunityInterests.opportunityId, status: schema.opportunityInterests.status }).from(schema.opportunityInterests).where(and(eq(schema.opportunityInterests.partnerId, user.partner.id), inArray(schema.opportunityInterests.opportunityId, visible.map((v) => v.id))))
    : [];
  return visible.map((o) => ({ id: o.id, title: o.title, kind: o.kind, summary: o.summary, description: o.description, deadline: o.deadline, interest: mine.find((m) => m.opportunityId === o.id)?.status ?? null }));
}

export async function expressInterest(user: HubUser, opportunityId: string, message: string, ctx: Ctx) {
  if (!hubCan(user.role, "opportunities.interest")) throw forbidden();
  const [opp] = await getDb().select().from(schema.opportunities).where(and(eq(schema.opportunities.id, opportunityId), eq(schema.opportunities.status, "open")));
  if (!opp || !matchesAudience(audienceOf(opp), await hubAudienceOf(user))) throw notFound("Oportunidade não encontrada.");
  if (opp.deadline && opp.deadline < new Date().toISOString().slice(0, 10)) throw conflict("O prazo desta oportunidade já passou.", "expired");
  const [row] = await getDb().insert(schema.opportunityInterests).values({ opportunityId, partnerId: user.partner.id, partnerUserId: user.id, message }).onConflictDoNothing().returning({ id: schema.opportunityInterests.id });
  if (!row) throw conflict("A sua empresa já manifestou interesse nesta oportunidade.", "duplicate");
  await audit({ actor: { id: null, email: user.email }, action: "alliance.hub.opportunity_interest", resourceType: "opportunity", resourceId: opportunityId, summary: `${user.partner.tradeName} tem interesse em "${opp.title}"`, ...ctx });
  const settings = await getProgramSettings();
  if (settings.notifyEmail) {
    await deliver({ dedupeKey: `team-interest:${row.id}`, template: "team_notice", to: settings.notifyEmail, params: { subject: `Interesse em "${opp.title}"`, summary: `${user.partner.tradeName} quer participar da oportunidade.`, url: `${cmsOrigin}/cms/alliance/recursos/oportunidades/${opportunityId}` } });
  }
}

/* -------------------------------------------------------------------------- */
/* Comunicados e avisos                                                        */
/* -------------------------------------------------------------------------- */

type AnnouncementInput = z.infer<typeof announcementInputSchema>;

export async function listAnnouncements() {
  return getDb().select().from(schema.allianceAnnouncements).orderBy(desc(schema.allianceAnnouncements.createdAt)).limit(200);
}

export async function saveAnnouncement(actor: Actor, id: string | null, input: AnnouncementInput, ctx: Ctx) {
  const db = getDb();
  if (!id) {
    const [row] = await db.insert(schema.allianceAnnouncements).values({ ...input, createdBy: actor.id }).returning({ id: schema.allianceAnnouncements.id });
    await audit({ actor, action: "alliance.announcement.created", resourceType: "announcement", resourceId: row.id, summary: `Criou o comunicado "${input.title}"`, ...ctx });
    return row;
  }
  const [before] = await db.select().from(schema.allianceAnnouncements).where(eq(schema.allianceAnnouncements.id, id));
  if (!before) throw notFound("Comunicado não encontrado.");
  if (before.status === "published") throw conflict("Comunicados publicados não mudam (as pessoas já receberam). Arquive e publique outro.", "published");
  await db.update(schema.allianceAnnouncements).set({ ...input, updatedAt: new Date() }).where(eq(schema.allianceAnnouncements.id, id));
  await audit({ actor, action: "alliance.announcement.updated", resourceType: "announcement", resourceId: id, summary: `Editou o comunicado "${input.title}"`, changes: diff(before, { ...before, ...input }), ...ctx });
  return { id };
}

/** Publica: vira aviso no Hub para as empresas do público escolhido; "importante" também vai por e-mail. */
export async function publishAnnouncement(actor: Actor, id: string, ctx: Ctx) {
  const db = getDb();
  const [row] = await db
    .update(schema.allianceAnnouncements)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.allianceAnnouncements.id, id), eq(schema.allianceAnnouncements.status, "draft")))
    .returning();
  if (!row) throw conflict("Só comunicados em rascunho podem ser publicados.", "invalid_status");
  await audit({ actor, action: "alliance.announcement.published", resourceType: "announcement", resourceId: id, summary: `Publicou o comunicado "${row.title}"${row.important ? " (importante, por e-mail)" : ""}`, ...ctx });
  const partners = await eligiblePartners(audienceOf(row));
  let people = 0;
  for (const partnerId of partners) {
    people += await notifyPartner(
      partnerId,
      { type: "announcement", title: row.title, body: row.body.slice(0, 280), link: `/alliance/avisos#${row.id}` },
      row.important ? { email: { template: "announcement", params: { title: row.title, body: row.body }, dedupeKey: `announcement:${row.id}` } } : {},
    );
  }
  return { partners: partners.length, people };
}

export async function archiveAnnouncement(actor: Actor, id: string, ctx: Ctx) {
  const [row] = await getDb().update(schema.allianceAnnouncements).set({ status: "archived", updatedAt: new Date() }).where(eq(schema.allianceAnnouncements.id, id)).returning({ title: schema.allianceAnnouncements.title });
  if (!row) throw notFound("Comunicado não encontrado.");
  await audit({ actor, action: "alliance.announcement.archived", resourceType: "announcement", resourceId: id, summary: `Arquivou o comunicado "${row.title}"`, ...ctx });
}

export async function hubAnnouncements(user: HubUser) {
  const who = await hubAudienceOf(user);
  const rows = await getDb().select().from(schema.allianceAnnouncements).where(eq(schema.allianceAnnouncements.status, "published")).orderBy(desc(schema.allianceAnnouncements.publishedAt)).limit(100);
  return rows.filter((r) => matchesAudience(audienceOf(r), who)).map((r) => ({ id: r.id, title: r.title, body: r.body, important: r.important, publishedAt: r.publishedAt }));
}

export async function hubNotifications(user: HubUser, limit = 50) {
  return getDb()
    .select({ id: schema.partnerNotifications.id, type: schema.partnerNotifications.type, title: schema.partnerNotifications.title, body: schema.partnerNotifications.body, link: schema.partnerNotifications.link, readAt: schema.partnerNotifications.readAt, createdAt: schema.partnerNotifications.createdAt })
    .from(schema.partnerNotifications)
    .where(and(eq(schema.partnerNotifications.partnerUserId, user.id), eq(schema.partnerNotifications.partnerId, user.partner.id)))
    .orderBy(desc(schema.partnerNotifications.createdAt))
    .limit(limit);
}

export async function unreadCount(user: HubUser) {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.partnerNotifications)
    .where(and(eq(schema.partnerNotifications.partnerUserId, user.id), sql`${schema.partnerNotifications.readAt} IS NULL`));
  return row?.n ?? 0;
}

export async function markNotificationsRead(user: HubUser, ids?: string[]) {
  await getDb()
    .update(schema.partnerNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.partnerNotifications.partnerUserId, user.id), sql`${schema.partnerNotifications.readAt} IS NULL`, ids?.length ? inArray(schema.partnerNotifications.id, ids) : undefined));
}

