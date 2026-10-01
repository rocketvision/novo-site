import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { audit, diff } from "@/server/audit";
import { cmsOrigin } from "@/server/env";
import { forbidden, HttpError } from "@/server/http/errors";
import { hubCan } from "@/lib/alliance/constants";
import type { PartnerSelfEdit } from "@/lib/alliance/validation";
import { deliver } from "./mail";
import { getProgramSettings } from "./settings";
import type { HubUser } from "./hub/session";

type Ctx = { ip: string | null; userAgent: string | null };

/**
 * "My Company" no Hub. Dados públicos (os que aparecem no site) só mudam com aprovação da Rocket:
 * o Hub cria um pedido de alteração. O contato interno (que nunca aparece no site) a empresa atualiza sozinha.
 */

const PUBLIC_FIELDS = ["tradeName", "shortDescription", "description", "websiteUrl", "location", "specialties", "services", "socialLinks", "logoMediaId"] as const;

export async function hubCompany(user: HubUser) {
  const db = getDb();
  const [row] = await db
    .select({ partner: schema.partners, logoUrl: schema.media.url })
    .from(schema.partners)
    .leftJoin(schema.media, eq(schema.media.id, schema.partners.logoMediaId))
    .where(eq(schema.partners.id, user.partner.id));
  const modalities = (await db.select({ key: schema.partnerModalityLinks.modalityKey }).from(schema.partnerModalityLinks).where(eq(schema.partnerModalityLinks.partnerId, user.partner.id))).map((m) => m.key);
  const requests = await db
    .select({ id: schema.partnerChangeRequests.id, status: schema.partnerChangeRequests.status, changes: schema.partnerChangeRequests.changes, reviewNote: schema.partnerChangeRequests.reviewNote, createdAt: schema.partnerChangeRequests.createdAt, reviewedAt: schema.partnerChangeRequests.reviewedAt })
    .from(schema.partnerChangeRequests)
    .where(eq(schema.partnerChangeRequests.partnerId, user.partner.id))
    .orderBy(desc(schema.partnerChangeRequests.createdAt))
    .limit(10);
  const p = row.partner;
  return {
    public: {
      tradeName: p.tradeName,
      shortDescription: p.shortDescription,
      description: p.description,
      websiteUrl: p.websiteUrl,
      location: p.location,
      specialties: p.specialties,
      services: p.services,
      socialLinks: p.socialLinks,
      logoMediaId: p.logoMediaId,
    },
    logoUrl: row.logoUrl,
    contact: { contactName: p.contactName, contactEmail: p.contactEmail, contactPhone: p.contactPhone },
    slug: p.slug,
    status: p.status,
    tierKey: p.tierKey,
    modalities,
    published: p.publishedSnapshot !== null && p.directoryEnabled,
    requests,
  };
}

export async function requestPublicChange(user: HubUser, input: PartnerSelfEdit, ctx: Ctx) {
  if (!hubCan(user.role, "company.edit")) throw forbidden();
  const db = getDb();
  const request = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(schema.partners).where(eq(schema.partners.id, user.partner.id)).for("update");
    // Só o que mudou vai para o pedido (a Rocket revisa exatamente a diferença).
    const changes: Record<string, unknown> = {};
    for (const key of PUBLIC_FIELDS) {
      if (input[key] === undefined) continue;
      if (JSON.stringify(input[key]) !== JSON.stringify(current[key])) changes[key] = input[key];
    }
    if (Object.keys(changes).length === 0) throw new HttpError(422, "no_changes", "Nada mudou em relação aos dados atuais.");
    if (changes.logoMediaId) {
      const [m] = await tx.select({ id: schema.media.id }).from(schema.media).where(eq(schema.media.id, changes.logoMediaId as string));
      if (!m) throw new HttpError(422, "validation_failed", "Envie o logotipo de novo.");
    }
    // Um pedido pendente por vez: o novo substitui o anterior.
    await tx
      .update(schema.partnerChangeRequests)
      .set({ status: "withdrawn", reviewedAt: new Date(), reviewNote: "Substituído por um pedido mais recente." })
      .where(and(eq(schema.partnerChangeRequests.partnerId, user.partner.id), eq(schema.partnerChangeRequests.status, "pending")));
    const [row] = await tx.insert(schema.partnerChangeRequests).values({ partnerId: user.partner.id, requestedBy: user.id, changes }).returning({ id: schema.partnerChangeRequests.id });
    await audit({ actor: { id: null, email: user.email }, action: "alliance.hub.change_requested", resourceType: "partner", resourceId: user.partner.id, summary: `${user.partner.tradeName} pediu alteração de dados públicos (${Object.keys(changes).join(", ")})`, changes: diff(Object.fromEntries(Object.keys(changes).map((k) => [k, current[k as keyof typeof current]])), changes), ...ctx }, tx);
    return row;
  });
  const settings = await getProgramSettings();
  if (settings.notifyEmail) {
    await deliver({ dedupeKey: `team-change:${request.id}`, template: "team_notice", to: settings.notifyEmail, params: { subject: `${user.partner.tradeName} pediu alteração de dados`, summary: "Um parceiro enviou alterações do perfil público para aprovação.", url: `${cmsOrigin}/cms/alliance/parceiros#pedidos` } });
  }
  return request;
}

export async function updateCompanyContact(user: HubUser, input: { contactName: string; contactEmail: string; contactPhone: string }, ctx: Ctx) {
  if (!hubCan(user.role, "company.edit")) throw forbidden();
  const db = getDb();
  const [before] = await db.select({ contactName: schema.partners.contactName, contactEmail: schema.partners.contactEmail, contactPhone: schema.partners.contactPhone }).from(schema.partners).where(eq(schema.partners.id, user.partner.id));
  // Sem mexer em updated_at: o contato não faz parte do perfil publicado (não gera "alterações não publicadas").
  await db.update(schema.partners).set(input).where(eq(schema.partners.id, user.partner.id));
  await audit({ actor: { id: null, email: user.email }, action: "alliance.hub.contact_updated", resourceType: "partner", resourceId: user.partner.id, summary: `${user.partner.tradeName} atualizou o contato principal`, changes: diff(before, input), ...ctx });
}
