import "server-only";
import { and, desc, eq, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import { getDb, schema } from "@/server/db";
import { audit } from "@/server/audit";
import { cmsOrigin } from "@/server/env";
import { conflict, HttpError, notFound } from "@/server/http/errors";
import { MODALITIES, type ApplicationStatus } from "@/lib/alliance/constants";
import { defaultPartnerPage } from "@/lib/alliance/page-blocks";
import type { applicationDecisionSchema, ApplicationInput } from "@/lib/alliance/validation";
import { deliver } from "./mail";
import { getProgramSettings } from "./settings";

type Actor = { id: string; email: string };
type Ctx = { ip: string | null; userAgent: string | null };

const OPEN: ApplicationStatus[] = ["pending_review", "info_requested"];

/* -------------------------------------------------------------------------- */
/* Envio pela página pública                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Grava a candidatura como Pending Review. Não cria parceiro nem acesso ao Hub.
 * Uma candidatura ainda em análise para o mesmo e-mail não é duplicada: a resposta é a mesma
 * (quem envia não descobre se o e-mail já estava cadastrado).
 */
export async function submitApplication(input: ApplicationInput, ctx: Ctx) {
  const db = getDb();
  const open = await db
    .select({ id: schema.partnerApplications.id })
    .from(schema.partnerApplications)
    .where(and(sql`lower(${schema.partnerApplications.email}) = ${input.email}`, inArray(schema.partnerApplications.status, OPEN)))
    .limit(1);
  if (open.length > 0) return { id: open[0].id, duplicate: true };

  const application = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.partnerApplications)
      .values({
        name: input.name,
        company: input.company,
        email: input.email,
        website: input.website,
        phone: input.phone,
        sector: input.sector,
        modalityKey: input.modality,
        companyDescription: input.companyDescription,
        interest: input.interest,
        consentPrivacy: input.consentPrivacy,
        consentMarketing: input.consentMarketing,
      })
      .returning({ id: schema.partnerApplications.id });
    await tx.insert(schema.partnerApplicationEvents).values({ applicationId: row.id, action: "submitted", message: "" });
    await audit(
      { actor: null, action: "alliance.application.submitted", resourceType: "partner_application", resourceId: row.id, summary: `Nova candidatura ao Rocket Alliance: ${input.company}`, ...ctx },
      tx,
    );
    return row;
  });

  await deliver({
    dedupeKey: `application-received:${application.id}`,
    template: "application_received",
    to: input.email,
    params: { name: input.name, company: input.company, modality: MODALITIES[input.modality].name },
  });
  const settings = await getProgramSettings().catch(() => null);
  if (settings?.notifyEmail) {
    await deliver({
      dedupeKey: `team-application:${application.id}`,
      template: "team_notice",
      to: settings.notifyEmail,
      params: {
        subject: `Nova candidatura: ${input.company}`,
        summary: `${input.name} (${input.company}) quer ser ${MODALITIES[input.modality].name}.`,
        url: `${cmsOrigin}/cms/alliance/candidaturas/${application.id}`,
      },
    });
  }
  return { id: application.id, duplicate: false };
}

/* -------------------------------------------------------------------------- */
/* CMS                                                                         */
/* -------------------------------------------------------------------------- */

const PAGE = 30;

export async function listApplications(input: { status?: ApplicationStatus; q?: string; before?: Date }) {
  const where: SQL[] = [];
  if (input.status) where.push(eq(schema.partnerApplications.status, input.status));
  const q = input.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(schema.partnerApplications.company, pattern), ilike(schema.partnerApplications.name, pattern), ilike(schema.partnerApplications.email, pattern))!);
  }
  if (input.before) where.push(lt(schema.partnerApplications.createdAt, input.before));
  const rows = await getDb()
    .select({
      id: schema.partnerApplications.id,
      name: schema.partnerApplications.name,
      company: schema.partnerApplications.company,
      email: schema.partnerApplications.email,
      sector: schema.partnerApplications.sector,
      modalityKey: schema.partnerApplications.modalityKey,
      status: schema.partnerApplications.status,
      createdAt: schema.partnerApplications.createdAt,
    })
    .from(schema.partnerApplications)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.partnerApplications.createdAt))
    .limit(PAGE + 1);
  const items = rows.slice(0, PAGE);
  return { items, nextBefore: rows.length > PAGE ? items.at(-1)!.createdAt : null };
}

export async function countApplicationsByStatus() {
  const rows = await getDb()
    .select({ status: schema.partnerApplications.status, total: sql<number>`count(*)::int` })
    .from(schema.partnerApplications)
    .groupBy(schema.partnerApplications.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.total])) as Partial<Record<ApplicationStatus, number>>;
}

export async function getApplication(id: string) {
  const db = getDb();
  const [row] = await db.select().from(schema.partnerApplications).where(eq(schema.partnerApplications.id, id));
  if (!row) return null;
  const events = await db
    .select({
      id: schema.partnerApplicationEvents.id,
      action: schema.partnerApplicationEvents.action,
      message: schema.partnerApplicationEvents.message,
      createdAt: schema.partnerApplicationEvents.createdAt,
      actorName: schema.users.name,
    })
    .from(schema.partnerApplicationEvents)
    .leftJoin(schema.users, eq(schema.users.id, schema.partnerApplicationEvents.actorUserId))
    .where(eq(schema.partnerApplicationEvents.applicationId, id))
    .orderBy(desc(schema.partnerApplicationEvents.createdAt));
  const partner = row.partnerId
    ? (await db.select({ id: schema.partners.id, tradeName: schema.partners.tradeName }).from(schema.partners).where(eq(schema.partners.id, row.partnerId)))[0] ?? null
    : null;
  return { row, events, partner };
}

type Decision = z.infer<typeof applicationDecisionSchema>;

/**
 * Decisão sobre uma candidatura. Aprovar cria o parceiro (em onboarding, com a página exclusiva em
 * branco e sem publicação), mas não cria acesso ao Hub: o convite é uma ação separada no cadastro.
 */
export async function decideApplication(actor: Actor, id: string, input: Decision, ctx: Ctx) {
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [app] = await tx.select().from(schema.partnerApplications).where(eq(schema.partnerApplications.id, id)).for("update");
    if (!app) throw notFound("Candidatura não encontrada.");
    const now = new Date();

    if (input.action === "note") {
      await tx.insert(schema.partnerApplicationEvents).values({ applicationId: id, action: "note", message: input.message, actorUserId: actor.id });
      return { app, partnerId: null as string | null };
    }
    if (!OPEN.includes(app.status as ApplicationStatus)) throw conflict("Esta candidatura já foi decidida.", "already_decided");

    if (input.action === "approve") {
      const taken = await tx.select({ id: schema.partners.id }).from(schema.partners).where(eq(schema.partners.slug, input.slug));
      if (taken.length) throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { slug: "Já existe um parceiro com este endereço." } });
      const [partner] = await tx
        .insert(schema.partners)
        .values({
          slug: input.slug,
          tradeName: app.company,
          tierKey: input.tierKey,
          status: "onboarding",
          contactName: app.name,
          contactEmail: app.email,
          contactPhone: app.phone,
          sector: app.sector,
          websiteUrl: app.website,
          internalNotes: `Candidatura: ${app.companyDescription}\n\nInteresse: ${app.interest}`,
          applicationId: app.id,
          createdBy: actor.id,
          updatedBy: actor.id,
        })
        .returning({ id: schema.partners.id });
      await tx.insert(schema.partnerModalityLinks).values(input.modalities.map((modalityKey) => ({ partnerId: partner.id, modalityKey, approvedBy: actor.id })));
      await tx.insert(schema.partnerPages).values({ partnerId: partner.id, content: defaultPartnerPage(), updatedBy: actor.id });
      await tx
        .update(schema.partnerApplications)
        .set({ status: "approved", partnerId: partner.id, decisionMessage: input.message, reviewedBy: actor.id, reviewedAt: now, updatedAt: now })
        .where(eq(schema.partnerApplications.id, id));
      await tx.insert(schema.partnerApplicationEvents).values({ applicationId: id, action: "approved", message: input.message, actorUserId: actor.id });
      await audit({ actor, action: "alliance.application.approved", resourceType: "partner_application", resourceId: id, summary: `Aprovou a candidatura de ${app.company} e criou o parceiro`, ...ctx }, tx);
      await audit({ actor, action: "alliance.partner.created", resourceType: "partner", resourceId: partner.id, summary: `Criou o parceiro ${app.company} a partir da candidatura`, ...ctx }, tx);
      return { app, partnerId: partner.id };
    }

    const status: ApplicationStatus = input.action === "reject" ? "rejected" : "info_requested";
    await tx
      .update(schema.partnerApplications)
      .set({ status, decisionMessage: input.message, reviewedBy: actor.id, reviewedAt: now, updatedAt: now })
      .where(eq(schema.partnerApplications.id, id));
    await tx.insert(schema.partnerApplicationEvents).values({ applicationId: id, action: input.action === "reject" ? "rejected" : "info_requested", message: input.message, actorUserId: actor.id });
    await audit(
      {
        actor,
        action: input.action === "reject" ? "alliance.application.rejected" : "alliance.application.info_requested",
        resourceType: "partner_application",
        resourceId: id,
        summary: input.action === "reject" ? `Recusou a candidatura de ${app.company}` : `Pediu mais informações a ${app.company}`,
        ...ctx,
      },
      tx,
    );
    return { app, partnerId: null };
  });

  const { app } = result;
  const params = { name: app.name, company: app.company, message: input.message };
  if (input.action === "approve") await deliver({ dedupeKey: `application-approved:${id}`, template: "application_approved", to: app.email, partnerId: result.partnerId, params });
  if (input.action === "reject") await deliver({ dedupeKey: `application-rejected:${id}`, template: "application_rejected", to: app.email, params });
  if (input.action === "request_info") {
    // Cada pedido de informação é um e-mail próprio (o dedupe usa o instante do pedido).
    await deliver({ dedupeKey: `application-info:${id}:${Date.now()}`, template: "application_info_requested", to: app.email, params });
  }
  return { partnerId: result.partnerId };
}
