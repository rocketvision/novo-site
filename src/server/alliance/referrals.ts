import "server-only";
import { and, asc, desc, eq, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import { getDb, schema, type Tx } from "@/server/db";
import { audit, diff } from "@/server/audit";
import { cmsOrigin } from "@/server/env";
import { conflict, forbidden, HttpError, notFound } from "@/server/http/errors";
import { enforce, POLICIES } from "@/server/security/rate-limit";
import {
  canTransition,
  hubCan,
  OPEN_REFERRAL_STATUSES,
  PARTNER_CANCELLABLE,
  referralStatusLabel,
  type ReferralStatus,
} from "@/lib/alliance/constants";
import { companyKeys } from "@/lib/alliance/identity";
import type { ReferralInput, referralUpdateSchema } from "@/lib/alliance/validation";
import { deliver } from "./mail";
import { notifyPartner } from "./notify";
import { getProgramSettings } from "./settings";
import type { HubUser } from "./hub/session";

type Actor = { id: string; email: string };
type Ctx = { ip: string | null; userAgent: string | null };

/**
 * Indicações do Rocket Alliance.
 *
 * Atribuição: vale o primeiro registro válido. Enquanto uma indicação está em andamento e dentro da
 * proteção (ou já foi ganha), ninguém mais registra a mesma empresa. Mesma empresa =
 * mesmo domínio (site ou e-mail corporativo) ou mesmo CNPJ. Nome igual sem domínio/CNPJ em comum entra,
 * marcado como possível duplicidade para a equipe decidir.
 *
 * Concorrência: o registro trava as chaves da empresa (pg_advisory_xact_lock) dentro da transação, então
 * dois parceiros enviando a mesma empresa no mesmo instante nunca ficam os dois com a proteção.
 *
 * Isolamento: toda leitura do Hub filtra pela empresa da sessão (e, para o Membro, pelas
 * indicações que ele mesmo registrou). Um ID de outra empresa responde 404, igual a um ID inexistente.
 */

const DAY = 24 * 3600_000;
const fmtDay = (d: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(d);

/** Indicações que seguram a empresa: em andamento dentro da proteção, ou ganhas. */
const HOLDING = sql`((${schema.referrals.status} IN ('submitted', 'under_review', 'qualified', 'in_negotiation') AND ${schema.referrals.protectedUntil} > now()) OR ${schema.referrals.status} = 'won')`;

async function lockKeys(tx: Tx, keys: (string | null)[]) {
  for (const key of keys.filter(Boolean).sort()) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`referral:${key}`}))`);
  }
}

/* -------------------------------------------------------------------------- */
/* Hub                                                                         */
/* -------------------------------------------------------------------------- */

export async function createReferral(user: HubUser, input: ReferralInput, ctx: Ctx) {
  if (!hubCan(user.role, "referrals.create")) throw forbidden();
  await enforce(POLICIES.referralByUser, user.id);
  const keys = companyKeys({ companyName: input.companyName, website: input.companyWebsite, contactEmail: input.contactEmail, taxId: input.companyTaxId });
  const settings = await getProgramSettings();

  const referral = await getDb().transaction(async (tx) => {
    await lockKeys(tx, [keys.domain && `d:${keys.domain}`, keys.taxId && `t:${keys.taxId}`, keys.nameKey && `n:${keys.nameKey}`]);

    const strong: SQL[] = [];
    if (keys.domain) strong.push(eq(schema.referrals.companyDomain, keys.domain));
    if (keys.taxId) strong.push(eq(schema.referrals.companyTaxId, keys.taxId));
    if (strong.length) {
      const [taken] = await tx
        .select({ partnerId: schema.referrals.partnerId, code: schema.referrals.code })
        .from(schema.referrals)
        .where(and(or(...strong), HOLDING))
        .limit(1);
      if (taken) {
        // Para outra empresa, só "já registrada": nunca quem indicou nem em que etapa está.
        const message =
          taken.partnerId === user.partner.id
            ? `A sua empresa já registrou esta indicação (${taken.code}). Acompanhe por ela.`
            : "Esta empresa já está registrada no programa e protegida para outra indicação.";
        throw new HttpError(409, "duplicate_referral", message, { fields: { companyName: message } });
      }
    }
    const [similar] = keys.nameKey
      ? await tx
          .select({ id: schema.referrals.id, partnerId: schema.referrals.partnerId, code: schema.referrals.code })
          .from(schema.referrals)
          .where(and(eq(schema.referrals.companyNameKey, keys.nameKey), HOLDING))
          .orderBy(asc(schema.referrals.createdAt))
          .limit(1)
      : [];
    if (similar && similar.partnerId === user.partner.id) {
      const message = `A sua empresa já registrou uma indicação com este nome (${similar.code}).`;
      throw new HttpError(409, "duplicate_referral", message, { fields: { companyName: message } });
    }

    const [row] = await tx
      .insert(schema.referrals)
      .values({
        partnerId: user.partner.id,
        submittedBy: user.id,
        companyName: input.companyName,
        companyWebsite: input.companyWebsite,
        companyTaxId: keys.taxId,
        companyDomain: keys.domain,
        companyNameKey: keys.nameKey,
        contactName: input.contactName,
        contactRole: input.contactRole,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        city: input.city,
        need: input.need,
        services: input.services,
        estimatedValueCents: input.estimatedValue ?? null,
        consentConfirmed: input.consentConfirmed,
        protectedUntil: new Date(Date.now() + settings.protectionDays * DAY),
        possibleDuplicateOf: similar?.id ?? null,
      })
      .returning();
    await tx.insert(schema.referralEvents).values({ referralId: row.id, toStatus: "submitted", actorType: "partner", actorPartnerUserId: user.id, note: "" });
    await audit(
      { actor: { id: null, email: user.email }, action: "alliance.hub.referral_created", resourceType: "referral", resourceId: row.id, summary: `${user.partner.tradeName} indicou ${input.companyName} (${row.code})`, ...ctx },
      tx,
    );
    return row;
  });

  await deliver({
    dedupeKey: `referral-received:${referral.id}`,
    template: "referral_received",
    to: user.email,
    partnerId: user.partner.id,
    params: { name: user.name, code: referral.code, company: referral.companyName, protectedUntil: fmtDay(referral.protectedUntil), id: referral.id },
  });
  if (settings.notifyEmail) {
    await deliver({
      dedupeKey: `team-referral:${referral.id}`,
      template: "team_notice",
      to: settings.notifyEmail,
      params: {
        subject: `Nova indicação ${referral.code}: ${referral.companyName}`,
        summary: `${user.partner.tradeName} indicou ${referral.companyName}.${referral.possibleDuplicateOf ? " Atenção: possível duplicidade com outra indicação." : ""}`,
        url: `${cmsOrigin}/cms/alliance/indicacoes/${referral.id}`,
      },
    });
  }
  return { id: referral.id, code: referral.code };
}

/** Filtro de isolamento do Hub: sempre a empresa da sessão; Membro vê só as dele. */
function hubScope(user: HubUser): SQL {
  const own = eq(schema.referrals.partnerId, user.partner.id);
  return hubCan(user.role, "referrals.view_all") ? own : and(own, eq(schema.referrals.submittedBy, user.id))!;
}

const hubColumns = {
  id: schema.referrals.id,
  code: schema.referrals.code,
  companyName: schema.referrals.companyName,
  contactName: schema.referrals.contactName,
  status: schema.referrals.status,
  protectedUntil: schema.referrals.protectedUntil,
  createdAt: schema.referrals.createdAt,
  updatedAt: schema.referrals.updatedAt,
  submittedByName: schema.partnerUsers.name,
};

export async function listReferralsForHub(user: HubUser, input: { status?: ReferralStatus; q?: string } = {}) {
  const where: SQL[] = [hubScope(user)];
  if (input.status) where.push(eq(schema.referrals.status, input.status));
  const q = input.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(schema.referrals.companyName, pattern), ilike(schema.referrals.code, pattern), ilike(schema.referrals.contactName, pattern))!);
  }
  return getDb()
    .select(hubColumns)
    .from(schema.referrals)
    .leftJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.referrals.submittedBy))
    .where(and(...where))
    .orderBy(desc(schema.referrals.createdAt))
    .limit(200);
}

export async function countReferralsForHub(user: HubUser) {
  const rows = await getDb().select({ status: schema.referrals.status, total: sql<number>`count(*)::int` }).from(schema.referrals).where(hubScope(user)).groupBy(schema.referrals.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.total])) as Partial<Record<ReferralStatus, number>>;
}

/** Detalhe para o Hub: sem anotações internas, sem responsável interno e só o histórico visível. */
export async function getReferralForHub(user: HubUser, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      ...hubColumns,
      companyWebsite: schema.referrals.companyWebsite,
      companyTaxId: schema.referrals.companyTaxId,
      contactRole: schema.referrals.contactRole,
      contactEmail: schema.referrals.contactEmail,
      contactPhone: schema.referrals.contactPhone,
      city: schema.referrals.city,
      need: schema.referrals.need,
      services: schema.referrals.services,
      estimatedValueCents: schema.referrals.estimatedValueCents,
      dealValueCents: schema.referrals.dealValueCents,
      lostReason: schema.referrals.lostReason,
      wonAt: schema.referrals.wonAt,
    })
    .from(schema.referrals)
    .leftJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.referrals.submittedBy))
    .where(and(eq(schema.referrals.id, id), hubScope(user)));
  if (!row) return null;
  const events = await db
    .select({ id: schema.referralEvents.id, fromStatus: schema.referralEvents.fromStatus, toStatus: schema.referralEvents.toStatus, note: schema.referralEvents.note, actorType: schema.referralEvents.actorType, createdAt: schema.referralEvents.createdAt, partnerName: schema.partnerUsers.name })
    .from(schema.referralEvents)
    .leftJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.referralEvents.actorPartnerUserId))
    .where(and(eq(schema.referralEvents.referralId, id), eq(schema.referralEvents.visibleToPartner, true)))
    .orderBy(desc(schema.referralEvents.createdAt));
  return { row, events };
}

async function lockHubReferral(tx: Tx, user: HubUser, id: string) {
  const [row] = await tx.select().from(schema.referrals).where(and(eq(schema.referrals.id, id), hubScope(user))).for("update");
  if (!row) throw notFound("Indicação não encontrada.");
  return row;
}

export async function cancelReferralByPartner(user: HubUser, id: string, reason: string, ctx: Ctx) {
  await getDb().transaction(async (tx) => {
    const row = await lockHubReferral(tx, user, id);
    if (!PARTNER_CANCELLABLE.includes(row.status as ReferralStatus)) throw conflict("Esta indicação já está em andamento com a equipe Rocket. Fale com a gente pelo suporte.", "not_cancellable");
    await tx.update(schema.referrals).set({ status: "cancelled", closedAt: new Date(), updatedAt: new Date(), version: sql`${schema.referrals.version} + 1` }).where(eq(schema.referrals.id, id));
    await tx.insert(schema.referralEvents).values({ referralId: id, fromStatus: row.status, toStatus: "cancelled", note: reason, actorType: "partner", actorPartnerUserId: user.id });
    await audit({ actor: { id: null, email: user.email }, action: "alliance.hub.referral_cancelled", resourceType: "referral", resourceId: id, summary: `${user.partner.tradeName} cancelou a indicação ${row.code}`, ...ctx }, tx);
  });
}

/** Mensagem do parceiro na indicação (vira histórico visível para os dois lados). */
export async function addPartnerNote(user: HubUser, id: string, note: string, ctx: Ctx) {
  await getDb().transaction(async (tx) => {
    const row = await lockHubReferral(tx, user, id);
    await tx.insert(schema.referralEvents).values({ referralId: id, note, actorType: "partner", actorPartnerUserId: user.id });
    await tx.update(schema.referrals).set({ updatedAt: new Date() }).where(eq(schema.referrals.id, id));
    await audit({ actor: { id: null, email: user.email }, action: "alliance.hub.referral_note", resourceType: "referral", resourceId: id, summary: `${user.partner.tradeName} comentou na indicação ${row.code}`, ...ctx }, tx);
  });
}

/* -------------------------------------------------------------------------- */
/* CMS                                                                         */
/* -------------------------------------------------------------------------- */

export async function listReferrals(input: { status?: ReferralStatus; partnerId?: string; q?: string; ownerId?: string; before?: Date }) {
  const where: SQL[] = [];
  if (input.status) where.push(eq(schema.referrals.status, input.status));
  if (input.partnerId) where.push(eq(schema.referrals.partnerId, input.partnerId));
  if (input.ownerId) where.push(eq(schema.referrals.ownerUserId, input.ownerId));
  if (input.before) where.push(lt(schema.referrals.createdAt, input.before));
  const q = input.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(schema.referrals.companyName, pattern), ilike(schema.referrals.code, pattern), ilike(schema.referrals.contactEmail, pattern), ilike(schema.referrals.companyDomain, pattern))!);
  }
  const rows = await getDb()
    .select({
      id: schema.referrals.id,
      code: schema.referrals.code,
      companyName: schema.referrals.companyName,
      status: schema.referrals.status,
      partnerId: schema.referrals.partnerId,
      partnerName: schema.partners.tradeName,
      ownerName: schema.users.name,
      protectedUntil: schema.referrals.protectedUntil,
      possibleDuplicate: sql<boolean>`${schema.referrals.possibleDuplicateOf} IS NOT NULL`,
      createdAt: schema.referrals.createdAt,
    })
    .from(schema.referrals)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.referrals.partnerId))
    .leftJoin(schema.users, eq(schema.users.id, schema.referrals.ownerUserId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.referrals.createdAt))
    .limit(51);
  return { items: rows.slice(0, 50), nextBefore: rows.length > 50 ? rows[49].createdAt : null };
}

export async function countReferralsByStatus(partnerId?: string) {
  const rows = await getDb()
    .select({ status: schema.referrals.status, total: sql<number>`count(*)::int` })
    .from(schema.referrals)
    .where(partnerId ? eq(schema.referrals.partnerId, partnerId) : undefined)
    .groupBy(schema.referrals.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.total])) as Partial<Record<ReferralStatus, number>>;
}

export async function getReferral(id: string) {
  const db = getDb();
  const [row] = await db
    .select({ referral: schema.referrals, partnerName: schema.partners.tradeName, partnerTier: schema.partners.tierKey, submittedByName: schema.partnerUsers.name, submittedByEmail: schema.partnerUsers.email })
    .from(schema.referrals)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.referrals.partnerId))
    .leftJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.referrals.submittedBy))
    .where(eq(schema.referrals.id, id));
  if (!row) return null;
  const [events, duplicate, related] = await Promise.all([
    db
      .select({
        id: schema.referralEvents.id,
        fromStatus: schema.referralEvents.fromStatus,
        toStatus: schema.referralEvents.toStatus,
        note: schema.referralEvents.note,
        visibleToPartner: schema.referralEvents.visibleToPartner,
        actorType: schema.referralEvents.actorType,
        createdAt: schema.referralEvents.createdAt,
        userName: schema.users.name,
        partnerUserName: schema.partnerUsers.name,
      })
      .from(schema.referralEvents)
      .leftJoin(schema.users, eq(schema.users.id, schema.referralEvents.actorUserId))
      .leftJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.referralEvents.actorPartnerUserId))
      .where(eq(schema.referralEvents.referralId, id))
      .orderBy(desc(schema.referralEvents.createdAt)),
    row.referral.possibleDuplicateOf
      ? db
          .select({ id: schema.referrals.id, code: schema.referrals.code, companyName: schema.referrals.companyName, partnerName: schema.partners.tradeName, status: schema.referrals.status, createdAt: schema.referrals.createdAt })
          .from(schema.referrals)
          .innerJoin(schema.partners, eq(schema.partners.id, schema.referrals.partnerId))
          .where(eq(schema.referrals.id, row.referral.possibleDuplicateOf))
      : Promise.resolve([]),
    // Outras indicações da mesma empresa (qualquer sinal), para a equipe ver o histórico de atribuição.
    db
      .select({ id: schema.referrals.id, code: schema.referrals.code, partnerName: schema.partners.tradeName, status: schema.referrals.status, createdAt: schema.referrals.createdAt })
      .from(schema.referrals)
      .innerJoin(schema.partners, eq(schema.partners.id, schema.referrals.partnerId))
      .where(
        and(
          sql`${schema.referrals.id} <> ${id}`,
          or(
            ...[
              row.referral.companyDomain ? eq(schema.referrals.companyDomain, row.referral.companyDomain) : undefined,
              row.referral.companyTaxId ? eq(schema.referrals.companyTaxId, row.referral.companyTaxId) : undefined,
              row.referral.companyNameKey ? eq(schema.referrals.companyNameKey, row.referral.companyNameKey) : undefined,
            ].filter(Boolean) as SQL[],
            sql`false`,
          ),
        ),
      )
      .orderBy(asc(schema.referrals.createdAt))
      .limit(20),
  ]);
  return { ...row, events, duplicate: duplicate[0] ?? null, related };
}

type ReferralUpdate = z.infer<typeof referralUpdateSchema>;

/**
 * Atualização pela equipe: status (com as transições permitidas), observação (visível ou interna),
 * responsável, valor do contrato, reatribuição (com justificativa) e extensão da proteção.
 */
export async function updateReferral(actor: Actor, id: string, input: ReferralUpdate, ctx: Ctx) {
  const effects = await getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(schema.referrals).where(eq(schema.referrals.id, id)).for("update");
    if (!row) throw notFound("Indicação não encontrada.");
    if (row.version !== input.version) throw conflict("Esta indicação foi alterada por outra pessoa. Recarregue a página.", "stale");
    const now = new Date();
    const patch: Partial<typeof schema.referrals.$inferInsert> = {};
    const from = row.status as ReferralStatus;
    let statusChanged: ReferralStatus | null = null;

    if (input.status && input.status !== from) {
      if (!canTransition(from, input.status)) throw conflict(`Não é possível ir de ${referralStatusLabel(from)} para ${referralStatusLabel(input.status)}.`, "invalid_transition");
      if (input.status === "lost" && !(input.lostReason ?? row.lostReason)) {
        throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { lostReason: "Informe o motivo da perda." } });
      }
      if (from === "won" && input.status === "cancelled") {
        const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(schema.revenueReceipts).where(eq(schema.revenueReceipts.referralId, id));
        if (n > 0) throw conflict("Esta indicação já tem recebimentos. Registre os reembolsos em Comissões em vez de cancelar.", "has_receipts");
      }
      patch.status = input.status;
      if (input.status === "won") patch.wonAt = now;
      if (["won", "lost", "cancelled"].includes(input.status)) patch.closedAt = now;
      // Reaberta: volta a ter proteção a partir de agora.
      if (OPEN_REFERRAL_STATUSES.includes(input.status) && (from === "lost" || from === "cancelled")) {
        patch.closedAt = null;
        const settings = await getProgramSettings();
        patch.protectedUntil = new Date(now.getTime() + settings.protectionDays * DAY);
      }
      statusChanged = input.status;
    }
    if (input.ownerUserId !== undefined) patch.ownerUserId = input.ownerUserId;
    if (input.dealValue !== undefined) patch.dealValueCents = input.dealValue;
    if (input.lostReason !== undefined) patch.lostReason = input.lostReason;
    if (input.internalNotes !== undefined) patch.internalNotes = input.internalNotes;
    if (input.extendProtectionDays) patch.protectedUntil = new Date(Math.max(row.protectedUntil.getTime(), now.getTime()) + input.extendProtectionDays * DAY);

    let reassigned: { from: string; to: string } | null = null;
    if (input.reassignTo && input.reassignTo !== row.partnerId) {
      if (!input.reassignReason) throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { reassignReason: "Justifique a reatribuição." } });
      const [target] = await tx.select({ id: schema.partners.id, tradeName: schema.partners.tradeName }).from(schema.partners).where(eq(schema.partners.id, input.reassignTo));
      if (!target) throw notFound("Parceiro não encontrado.");
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(schema.revenueReceipts).where(eq(schema.revenueReceipts.referralId, id));
      if (n > 0) throw conflict("Indicação com recebimentos não pode mudar de parceiro: as comissões já pertencem a quem indicou.", "has_receipts");
      patch.partnerId = target.id;
      patch.submittedBy = null;
      reassigned = { from: row.partnerId, to: target.id };
    }

    const [updated] = await tx
      .update(schema.referrals)
      .set({ ...patch, updatedAt: now, version: sql`${schema.referrals.version} + 1` })
      .where(eq(schema.referrals.id, id))
      .returning();

    const note = input.note?.trim() ?? "";
    if (statusChanged || note) {
      await tx.insert(schema.referralEvents).values({
        referralId: id,
        fromStatus: statusChanged ? from : null,
        toStatus: statusChanged,
        note,
        // Mudança de status sempre aparece para o parceiro; a observação segue a escolha da equipe.
        visibleToPartner: statusChanged ? (note ? (input.noteVisibleToPartner ?? true) : true) : (input.noteVisibleToPartner ?? false),
        actorType: "cms",
        actorUserId: actor.id,
      });
    }
    if (reassigned) {
      await tx.insert(schema.referralEvents).values({ referralId: id, note: `Reatribuída: ${input.reassignReason}`, visibleToPartner: false, actorType: "cms", actorUserId: actor.id });
    }
    const changes = diff(
      { status: row.status, ownerUserId: row.ownerUserId, dealValueCents: row.dealValueCents, lostReason: row.lostReason, internalNotes: row.internalNotes, partnerId: row.partnerId, protectedUntil: row.protectedUntil },
      { status: updated.status, ownerUserId: updated.ownerUserId, dealValueCents: updated.dealValueCents, lostReason: updated.lostReason, internalNotes: updated.internalNotes, partnerId: updated.partnerId, protectedUntil: updated.protectedUntil },
    );
    await audit(
      {
        actor,
        action: reassigned ? "alliance.referral.reassigned" : statusChanged ? "alliance.referral.status_changed" : "alliance.referral.updated",
        resourceType: "referral",
        resourceId: id,
        summary: reassigned
          ? `Reatribuiu a indicação ${row.code}: ${input.reassignReason}`
          : statusChanged
            ? `Indicação ${row.code}: ${referralStatusLabel(from)} → ${referralStatusLabel(statusChanged)}`
            : `Atualizou a indicação ${row.code}`,
        changes,
        ...ctx,
      },
      tx,
    );
    return { updated, statusChanged, visibleNote: statusChanged && (input.noteVisibleToPartner ?? true) ? note : "" };
  });

  const r = effects.updated;
  if (effects.statusChanged) {
    const recipients = [...new Set([r.submittedBy].filter(Boolean) as string[])];
    const params = { code: r.code, company: r.companyName, status: effects.statusChanged, note: effects.visibleNote, id: r.id };
    await notifyPartner(
      r.partnerId,
      { type: "referral", title: `${r.code}: ${referralStatusLabel(effects.statusChanged)}`, body: `${r.companyName}${effects.visibleNote ? `. ${effects.visibleNote}` : ""}`, link: `/alliance/indicacoes/${r.id}` },
      { roles: ["owner", "manager"], email: { template: "referral_status", params, dedupeKey: `referral-status:${r.id}:${r.version}` } },
    );
    // Quem registrou (se for Membro) também recebe.
    if (recipients.length) {
      const [submitter] = await getDb().select({ role: schema.partnerUsers.role }).from(schema.partnerUsers).where(inArray(schema.partnerUsers.id, recipients));
      if (submitter?.role === "member") {
        await notifyPartner(
          r.partnerId,
          { type: "referral", title: `${r.code}: ${referralStatusLabel(effects.statusChanged)}`, body: r.companyName, link: `/alliance/indicacoes/${r.id}` },
          { userIds: recipients, email: { template: "referral_status", params, dedupeKey: `referral-status:${r.id}:${r.version}` } },
        );
      }
    }
  }
  return { version: r.version };
}

/** Responsáveis possíveis: pessoas do CMS que gerenciam indicações. */
export async function referralOwners() {
  return getDb()
    .selectDistinct({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .innerJoin(schema.rolePermissions, eq(schema.rolePermissions.roleId, schema.users.roleId))
    .where(and(eq(schema.users.status, "active"), eq(schema.rolePermissions.permissionKey, "alliance.referrals")))
    .orderBy(asc(schema.users.name));
}
