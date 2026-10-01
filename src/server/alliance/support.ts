import "server-only";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { audit } from "@/server/audit";
import { cmsOrigin } from "@/server/env";
import { notFound } from "@/server/http/errors";
import { enforce, POLICIES } from "@/server/security/rate-limit";
import type { TicketStatus } from "@/lib/alliance/constants";
import { deliver } from "./mail";
import { notifyPartner } from "./notify";
import { getProgramSettings } from "./settings";
import type { HubUser } from "./hub/session";

type Actor = { id: string; email: string };
type Ctx = { ip: string | null; userAgent: string | null };

/**
 * Suporte do Alliance Hub: chamados da empresa com a equipe Rocket Vision. Todas as pessoas da empresa
 * veem os chamados da empresa (e só dela). Resposta da Rocket avisa no Hub e por e-mail.
 */

export async function createTicket(user: HubUser, input: { subject: string; category: string; body: string }, ctx: Ctx) {
  await enforce(POLICIES.ticketByUser, user.id);
  const ticket = await getDb().transaction(async (tx) => {
    const [t] = await tx.insert(schema.supportTickets).values({ partnerId: user.partner.id, createdBy: user.id, subject: input.subject, category: input.category }).returning();
    await tx.insert(schema.supportMessages).values({ ticketId: t.id, authorType: "partner", authorPartnerUserId: user.id, body: input.body });
    await audit({ actor: { id: null, email: user.email }, action: "alliance.hub.ticket_created", resourceType: "support_ticket", resourceId: t.id, summary: `${user.partner.tradeName} abriu o chamado ${t.code}: ${input.subject}`, ...ctx }, tx);
    return t;
  });
  const settings = await getProgramSettings();
  if (settings.notifyEmail) {
    await deliver({ dedupeKey: `team-ticket:${ticket.id}`, template: "team_notice", to: settings.notifyEmail, params: { subject: `Chamado ${ticket.code}: ${input.subject}`, summary: `${user.partner.tradeName} abriu um chamado de suporte.`, url: `${cmsOrigin}/cms/alliance/comunicacoes/suporte/${ticket.id}` } });
  }
  return { id: ticket.id, code: ticket.code };
}

export async function hubTickets(user: HubUser) {
  return getDb()
    .select({ id: schema.supportTickets.id, code: schema.supportTickets.code, subject: schema.supportTickets.subject, category: schema.supportTickets.category, status: schema.supportTickets.status, lastMessageAt: schema.supportTickets.lastMessageAt, createdAt: schema.supportTickets.createdAt })
    .from(schema.supportTickets)
    .where(eq(schema.supportTickets.partnerId, user.partner.id))
    .orderBy(desc(schema.supportTickets.lastMessageAt));
}

async function messages(ticketId: string) {
  return getDb()
    .select({ id: schema.supportMessages.id, authorType: schema.supportMessages.authorType, body: schema.supportMessages.body, createdAt: schema.supportMessages.createdAt, userName: schema.users.name, partnerUserName: schema.partnerUsers.name })
    .from(schema.supportMessages)
    .leftJoin(schema.users, eq(schema.users.id, schema.supportMessages.authorUserId))
    .leftJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.supportMessages.authorPartnerUserId))
    .where(eq(schema.supportMessages.ticketId, ticketId))
    .orderBy(asc(schema.supportMessages.createdAt));
}

export async function hubTicket(user: HubUser, id: string) {
  const [ticket] = await getDb().select().from(schema.supportTickets).where(and(eq(schema.supportTickets.id, id), eq(schema.supportTickets.partnerId, user.partner.id)));
  if (!ticket) return null;
  // No Hub, respostas da Rocket aparecem como "Equipe Rocket Vision" (sem expor quem do CMS respondeu).
  return { ticket, messages: (await messages(id)).map((m) => ({ ...m, userName: m.authorType === "cms" ? "Equipe Rocket Vision" : null })) };
}

export async function replyAsPartner(user: HubUser, id: string, input: { body: string; close?: boolean }, ctx: Ctx) {
  await enforce(POLICIES.ticketByUser, user.id);
  await getDb().transaction(async (tx) => {
    const [ticket] = await tx.select().from(schema.supportTickets).where(and(eq(schema.supportTickets.id, id), eq(schema.supportTickets.partnerId, user.partner.id))).for("update");
    if (!ticket) throw notFound("Chamado não encontrado.");
    await tx.insert(schema.supportMessages).values({ ticketId: id, authorType: "partner", authorPartnerUserId: user.id, body: input.body });
    await tx.update(schema.supportTickets).set({ status: input.close ? "closed" : "open", lastMessageAt: new Date(), updatedAt: new Date() }).where(eq(schema.supportTickets.id, id));
    await audit({ actor: { id: null, email: user.email }, action: "alliance.hub.ticket_reply", resourceType: "support_ticket", resourceId: id, summary: `${user.partner.tradeName} respondeu o chamado ${ticket.code}`, ...ctx }, tx);
  });
}

/* -------------------------------------------------------------------------- */
/* CMS                                                                         */
/* -------------------------------------------------------------------------- */

export async function listTickets(input: { status?: TicketStatus; partnerId?: string } = {}) {
  const where: SQL[] = [];
  if (input.status) where.push(eq(schema.supportTickets.status, input.status));
  if (input.partnerId) where.push(eq(schema.supportTickets.partnerId, input.partnerId));
  return getDb()
    .select({ id: schema.supportTickets.id, code: schema.supportTickets.code, subject: schema.supportTickets.subject, category: schema.supportTickets.category, status: schema.supportTickets.status, lastMessageAt: schema.supportTickets.lastMessageAt, partnerName: schema.partners.tradeName, assignedName: schema.users.name })
    .from(schema.supportTickets)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.supportTickets.partnerId))
    .leftJoin(schema.users, eq(schema.users.id, schema.supportTickets.assignedTo))
    .where(where.length ? and(...where) : undefined)
    .orderBy(sql`case ${schema.supportTickets.status} when 'open' then 0 when 'answered' then 1 else 2 end`, desc(schema.supportTickets.lastMessageAt))
    .limit(200);
}

export async function getTicket(id: string) {
  const [row] = await getDb()
    .select({ ticket: schema.supportTickets, partnerName: schema.partners.tradeName, openedBy: schema.partnerUsers.name })
    .from(schema.supportTickets)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.supportTickets.partnerId))
    .leftJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.supportTickets.createdBy))
    .where(eq(schema.supportTickets.id, id));
  if (!row) return null;
  return { ...row, messages: await messages(id) };
}

export async function replyAsTeam(actor: Actor, id: string, input: { body: string; close?: boolean }, ctx: Ctx) {
  const ticket = await getDb().transaction(async (tx) => {
    const [t] = await tx.select().from(schema.supportTickets).where(eq(schema.supportTickets.id, id)).for("update");
    if (!t) throw notFound("Chamado não encontrado.");
    const [m] = await tx.insert(schema.supportMessages).values({ ticketId: id, authorType: "cms", authorUserId: actor.id, body: input.body }).returning({ id: schema.supportMessages.id });
    await tx.update(schema.supportTickets).set({ status: input.close ? "closed" : "answered", assignedTo: t.assignedTo ?? actor.id, lastMessageAt: new Date(), updatedAt: new Date() }).where(eq(schema.supportTickets.id, id));
    await audit({ actor, action: "alliance.ticket.replied", resourceType: "support_ticket", resourceId: id, summary: `Respondeu o chamado ${t.code}`, ...ctx }, tx);
    return { ...t, messageId: m.id };
  });
  await notifyPartner(
    ticket.partnerId,
    { type: "support", title: `Resposta no chamado ${ticket.code}`, body: ticket.subject, link: `/alliance/suporte/${ticket.id}` },
    { userIds: ticket.createdBy ? [ticket.createdBy] : undefined, roles: ticket.createdBy ? undefined : ["owner", "manager"], email: { template: "support_reply", params: { code: ticket.code, subject: ticket.subject, id: ticket.id }, dedupeKey: `support-reply:${ticket.messageId}` } },
  );
}

export async function setTicketStatus(actor: Actor, id: string, input: { status: TicketStatus; assignedTo?: string | null }, ctx: Ctx) {
  const [row] = await getDb()
    .update(schema.supportTickets)
    .set({ status: input.status, ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }), updatedAt: new Date() })
    .where(eq(schema.supportTickets.id, id))
    .returning({ code: schema.supportTickets.code });
  if (!row) throw notFound("Chamado não encontrado.");
  await audit({ actor, action: "alliance.ticket.status", resourceType: "support_ticket", resourceId: id, summary: `Chamado ${row.code}: ${input.status}`, ...ctx });
}

