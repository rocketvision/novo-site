import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import { getDb, schema, type Tx } from "@/server/db";
import { audit, diff } from "@/server/audit";
import { invalidate } from "@/server/cache";
import { conflict, HttpError, notFound } from "@/server/http/errors";
import { formatMoney, commissionCents, formatRate, parseRate } from "@/lib/alliance/money";
import type { adjustmentInputSchema, payoutInputSchema, receiptInputSchema, ruleInputSchema } from "@/lib/alliance/validation";
import { notifyPartner } from "./notify";
import { ALLIANCE_TAGS } from "./tags";
import { pgError } from "./db-errors";

type Actor = { id: string; email: string };
type Ctx = { ip: string | null; userAgent: string | null };

/**
 * Motor de comissões do Rocket Alliance.
 *
 * - Base: receita líquida elegível efetivamente recebida (recebimentos registrados pela Rocket numa
 *   indicação ganha). Nunca um valor informado pelo parceiro nem calculado no navegador.
 * - Regra: a aprovada e vigente na data do recebimento, da mais específica para a mais geral
 *   (parceiro > nível + modalidade > nível > geral). Nenhum percentual no código.
 * - Recorrentes: só as primeiras N mensalidades (N da regra) geram comissão.
 * - Um lançamento por recebimento (índice único): o mesmo recebimento nunca gera duas comissões.
 * - Reembolso: novo lançamento negativo (estorno) com a mesma taxa da comissão original.
 * - Pagamento: soma lançamentos aprovados, travados na transação; cada lançamento entra em um único
 *   pagamento (payout_id) e a chave de idempotência impede registrar o mesmo pagamento duas vezes.
 * - Nada é apagado: cancelamentos e estornos ficam no histórico, com autor e motivo.
 */

/* -------------------------------------------------------------------------- */
/* Regras                                                                      */
/* -------------------------------------------------------------------------- */

type RuleInput = z.infer<typeof ruleInputSchema>;

export async function listRules() {
  return getDb()
    .select({ rule: schema.commissionRules, partnerName: schema.partners.tradeName, approvedByName: schema.users.name })
    .from(schema.commissionRules)
    .leftJoin(schema.partners, eq(schema.partners.id, schema.commissionRules.partnerId))
    .leftJoin(schema.users, eq(schema.users.id, schema.commissionRules.approvedBy))
    .orderBy(asc(schema.commissionRules.status), desc(schema.commissionRules.validFrom));
}

function ruleValues(input: RuleInput) {
  const rateBp = parseRate(input.ratePercent);
  if (rateBp === null) throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { ratePercent: "Percentual inválido." } });
  return {
    name: input.name,
    partnerId: input.partnerId,
    tierKey: input.tierKey,
    modalityKey: input.modalityKey,
    scope: input.scope,
    rateBp,
    recurringMonths: input.recurringMonths,
    validFrom: input.validFrom,
    validTo: input.validTo,
    isPublic: input.isPublic,
    notes: input.notes,
  };
}

export async function createRule(actor: Actor, input: RuleInput, ctx: Ctx) {
  const values = ruleValues(input);
  const [row] = await getDb().insert(schema.commissionRules).values({ ...values, status: "draft", createdBy: actor.id }).returning({ id: schema.commissionRules.id });
  await audit({ actor, action: "alliance.rule.created", resourceType: "commission_rule", resourceId: row.id, summary: `Criou a regra de comissão "${input.name}" (${formatRate(values.rateBp)}), aguardando aprovação`, ...ctx });
  return row;
}

/** Só regras em rascunho mudam. Aprovada é imutável: para mudar, arquive e crie outra (o histórico fica). */
export async function updateRule(actor: Actor, id: string, input: RuleInput, ctx: Ctx) {
  await getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(schema.commissionRules).where(eq(schema.commissionRules.id, id)).for("update");
    if (!row) throw notFound("Regra não encontrada.");
    if (row.status !== "draft") throw conflict("Regras aprovadas não mudam. Arquive esta e crie uma nova.", "rule_locked");
    const values = ruleValues(input);
    await tx.update(schema.commissionRules).set({ ...values, updatedAt: new Date(), version: sql`${schema.commissionRules.version} + 1` }).where(eq(schema.commissionRules.id, id));
    await audit({ actor, action: "alliance.rule.updated", resourceType: "commission_rule", resourceId: id, summary: `Editou a regra "${input.name}"`, changes: diff({ ...row }, { ...row, ...values }), ...ctx }, tx);
  });
}

export async function setRuleStatus(actor: Actor, id: string, status: "approved" | "archived", ctx: Ctx) {
  await getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(schema.commissionRules).where(eq(schema.commissionRules.id, id)).for("update");
    if (!row) throw notFound("Regra não encontrada.");
    if (status === "approved" && row.status !== "draft") throw conflict("Só regras aguardando aprovação podem ser aprovadas.", "invalid_status");
    if (status === "archived" && row.status === "archived") throw conflict("A regra já está arquivada.", "invalid_status");
    await tx
      .update(schema.commissionRules)
      .set({ status, ...(status === "approved" && { approvedBy: actor.id, approvedAt: new Date() }), updatedAt: new Date(), version: sql`${schema.commissionRules.version} + 1` })
      .where(eq(schema.commissionRules.id, id));
    await audit(
      {
        actor,
        action: status === "approved" ? "alliance.rule.approved" : "alliance.rule.archived",
        resourceType: "commission_rule",
        resourceId: id,
        summary: status === "approved" ? `Aprovou a regra "${row.name}" (${formatRate(row.rateBp)})` : `Arquivou a regra "${row.name}"`,
        changes: { status: { before: row.status, after: status } },
        ...ctx,
      },
      tx,
    );
  });
  invalidate(ALLIANCE_TAGS.program);
}

type Resolved = { id: string; rateBp: number; recurringMonths: number };

/** A regra que vale para um recebimento. Pura consulta: nenhum percentual padrão escondido no código. */
export async function resolveRule(
  runner: Tx | ReturnType<typeof getDb>,
  input: { partnerId: string; tierKey: string; modalities: string[]; kind: "one_time" | "recurring"; date: string },
): Promise<Resolved | null> {
  const rules = await runner
    .select()
    .from(schema.commissionRules)
    .where(
      and(
        eq(schema.commissionRules.status, "approved"),
        lte(schema.commissionRules.validFrom, input.date),
        or(isNull(schema.commissionRules.validTo), gte(schema.commissionRules.validTo, input.date)),
        or(eq(schema.commissionRules.scope, "all"), eq(schema.commissionRules.scope, input.kind)),
        or(isNull(schema.commissionRules.partnerId), eq(schema.commissionRules.partnerId, input.partnerId)),
        or(isNull(schema.commissionRules.tierKey), eq(schema.commissionRules.tierKey, input.tierKey)),
        or(isNull(schema.commissionRules.modalityKey), input.modalities.length ? inArray(schema.commissionRules.modalityKey, input.modalities) : sql`false`),
      ),
    );
  if (rules.length === 0) return null;
  // Especificidade: parceiro (4) + modalidade (2) + nível (1). Empate: a vigência mais recente.
  const score = (r: (typeof rules)[number]) => (r.partnerId ? 4 : 0) + (r.modalityKey ? 2 : 0) + (r.tierKey ? 1 : 0);
  rules.sort((a, b) => score(b) - score(a) || b.validFrom.localeCompare(a.validFrom) || b.createdAt.getTime() - a.createdAt.getTime());
  const best = rules[0];
  return { id: best.id, rateBp: best.rateBp, recurringMonths: best.recurringMonths };
}

/* -------------------------------------------------------------------------- */
/* Recebimentos                                                                */
/* -------------------------------------------------------------------------- */

type ReceiptInput = z.infer<typeof receiptInputSchema>;

export type ReceiptResult = { receiptId: string; entry: { id: string; amountCents: number; rateBp: number | null } | null; note: string };

export async function recordReceipt(actor: Actor, input: ReceiptInput, ctx: Ctx): Promise<ReceiptResult> {
  try {
    return await getDb().transaction(async (tx) => {
      const [referral] = await tx.select().from(schema.referrals).where(eq(schema.referrals.id, input.referralId)).for("update");
      if (!referral) throw notFound("Indicação não encontrada.");
      if (referral.status !== "won") throw conflict("Recebimentos só entram em indicações ganhas (Won).", "not_won");

      if (input.kind === "refund") return recordRefund(tx, actor, referral, input, ctx);

      const [partner] = await tx.select({ tierKey: schema.partners.tierKey }).from(schema.partners).where(eq(schema.partners.id, referral.partnerId));
      const modalities = (await tx.select({ key: schema.partnerModalityLinks.modalityKey }).from(schema.partnerModalityLinks).where(eq(schema.partnerModalityLinks.partnerId, referral.partnerId))).map((m) => m.key);
      const [receipt] = await tx
        .insert(schema.revenueReceipts)
        .values({
          referralId: referral.id,
          partnerId: referral.partnerId,
          kind: input.kind,
          installmentNumber: input.installmentNumber,
          amountCents: input.amount,
          receivedOn: input.receivedOn,
          description: input.description,
          externalRef: input.externalRef,
          createdBy: actor.id,
        })
        .returning();

      const rule = await resolveRule(tx, { partnerId: referral.partnerId, tierKey: partner.tierKey, modalities, kind: input.kind, date: input.receivedOn });
      let note = "";
      let entry: ReceiptResult["entry"] = null;
      if (!rule) note = "Nenhuma regra aprovada e vigente se aplica: o recebimento foi registrado sem comissão.";
      else if (input.kind === "recurring" && input.installmentNumber! > rule.recurringMonths) note = `Mensalidade ${input.installmentNumber} fora da janela da regra (${rule.recurringMonths} mensalidades): sem comissão.`;
      else {
        const amount = commissionCents(input.amount, rule.rateBp);
        if (amount === 0) note = "A comissão calculada é zero.";
        else {
          const [row] = await tx
            .insert(schema.commissionEntries)
            .values({ partnerId: referral.partnerId, referralId: referral.id, receiptId: receipt.id, ruleId: rule.id, kind: "commission", tierKey: partner.tierKey, baseCents: input.amount, rateBp: rule.rateBp, amountCents: amount, status: "pending", createdBy: actor.id })
            .returning({ id: schema.commissionEntries.id });
          entry = { id: row.id, amountCents: amount, rateBp: rule.rateBp };
        }
      }
      await audit(
        {
          actor,
          action: "alliance.receipt.recorded",
          resourceType: "revenue_receipt",
          resourceId: receipt.id,
          summary: `Registrou ${formatMoney(input.amount)} recebidos na indicação ${referral.code}${entry ? `: comissão de ${formatMoney(entry.amountCents)} (${formatRate(entry.rateBp!)}) pendente` : `. ${note}`}`,
          ...ctx,
        },
        tx,
      );
      return { receiptId: receipt.id, entry, note };
    });
  } catch (error) {
    translate(error);
  }
}

async function recordRefund(tx: Tx, actor: Actor, referral: typeof schema.referrals.$inferSelect, input: ReceiptInput, ctx: Ctx): Promise<ReceiptResult> {
  const [original] = await tx
    .select()
    .from(schema.revenueReceipts)
    .where(and(eq(schema.revenueReceipts.id, input.refundOf!), eq(schema.revenueReceipts.referralId, referral.id)))
    .for("update");
  if (!original || original.kind === "refund") throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { refundOf: "Escolha um recebimento desta indicação." } });
  const [{ refunded }] = await tx
    .select({ refunded: sql<string>`coalesce(sum(${schema.revenueReceipts.amountCents}), 0)` })
    .from(schema.revenueReceipts)
    .where(and(eq(schema.revenueReceipts.refundOf, original.id)));
  const remaining = original.amountCents - Number(refunded);
  if (input.amount > remaining) {
    throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { amount: `O reembolso passa do que ainda pode ser devolvido (${formatMoney(remaining)}).` } });
  }
  const [receipt] = await tx
    .insert(schema.revenueReceipts)
    .values({ referralId: referral.id, partnerId: original.partnerId, kind: "refund", amountCents: input.amount, receivedOn: input.receivedOn, refundOf: original.id, description: input.description, externalRef: input.externalRef, createdBy: actor.id })
    .returning();

  const [originalEntry] = await tx.select().from(schema.commissionEntries).where(eq(schema.commissionEntries.receiptId, original.id)).for("update");
  let entry: ReceiptResult["entry"] = null;
  let note = "";
  if (!originalEntry || originalEntry.status === "cancelled" || originalEntry.rateBp === null) {
    note = "O recebimento original não gerou comissão válida: nada a estornar.";
  } else {
    const amount = -commissionCents(input.amount, originalEntry.rateBp);
    if (amount !== 0) {
      const [row] = await tx
        .insert(schema.commissionEntries)
        .values({
          partnerId: originalEntry.partnerId,
          referralId: referral.id,
          receiptId: receipt.id,
          ruleId: originalEntry.ruleId,
          kind: "reversal",
          tierKey: originalEntry.tierKey,
          baseCents: -input.amount,
          rateBp: originalEntry.rateBp,
          amountCents: amount,
          status: "pending",
          reason: `Reembolso de ${formatMoney(input.amount)}`,
          reversalOf: originalEntry.id,
          createdBy: actor.id,
        })
        .returning({ id: schema.commissionEntries.id });
      entry = { id: row.id, amountCents: amount, rateBp: originalEntry.rateBp };
    }
  }
  await audit(
    { actor, action: "alliance.receipt.refunded", resourceType: "revenue_receipt", resourceId: receipt.id, summary: `Registrou reembolso de ${formatMoney(input.amount)} na indicação ${referral.code}${entry ? `: estorno de ${formatMoney(entry.amountCents)}` : ""}`, ...ctx },
    tx,
  );
  return { receiptId: receipt.id, entry, note };
}

function translate(error: unknown): never {
  const { code, constraint = "" } = pgError(error);
  if (code === "23505" && constraint.includes("external")) throw new HttpError(409, "duplicate_receipt", "Este recebimento já foi registrado (mesma referência).", { fields: { externalRef: "Referência já registrada." } });
  if (code === "23505" && constraint.includes("installment")) throw new HttpError(409, "duplicate_receipt", "Esta mensalidade já foi registrada para a indicação.", { fields: { installmentNumber: "Mensalidade já registrada." } });
  if (code === "23505" && constraint.includes("receipt")) throw new HttpError(409, "duplicate_entry", "Este recebimento já gerou comissão.");
  throw error;
}

/* -------------------------------------------------------------------------- */
/* Lançamentos                                                                 */
/* -------------------------------------------------------------------------- */

export async function createAdjustment(actor: Actor, input: z.infer<typeof adjustmentInputSchema>, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    const [partner] = await tx.select({ tradeName: schema.partners.tradeName }).from(schema.partners).where(eq(schema.partners.id, input.partnerId));
    if (!partner) throw notFound("Parceiro não encontrado.");
    if (input.referralId) {
      const [r] = await tx.select({ partnerId: schema.referrals.partnerId }).from(schema.referrals).where(eq(schema.referrals.id, input.referralId));
      if (!r || r.partnerId !== input.partnerId) throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { referralId: "A indicação não é deste parceiro." } });
    }
    const [row] = await tx
      .insert(schema.commissionEntries)
      .values({ partnerId: input.partnerId, referralId: input.referralId, kind: "adjustment", baseCents: 0, amountCents: input.amount, status: "pending", reason: input.reason, createdBy: actor.id })
      .returning({ id: schema.commissionEntries.id });
    await audit({ actor, action: "alliance.entry.adjustment", resourceType: "commission_entry", resourceId: row.id, summary: `Lançou ajuste de ${formatMoney(input.amount)} para ${partner.tradeName}: ${input.reason}`, ...ctx }, tx);
    return row;
  });
}

/** Aprova (pendente → aprovada) ou cancela (pendente/aprovada → cancelada). Paga nunca volta por aqui. */
export async function actOnEntries(actor: Actor, ids: string[], action: "approve" | "cancel", reason: string, ctx: Ctx) {
  if (action === "cancel" && !reason) throw new HttpError(422, "validation_failed", "Revise os campos destacados.", { fields: { reason: "Informe o motivo do cancelamento." } });
  const approvedByPartner = new Map<string, { total: number; count: number }>();
  await getDb().transaction(async (tx) => {
    const rows = await tx.select().from(schema.commissionEntries).where(inArray(schema.commissionEntries.id, ids)).orderBy(asc(schema.commissionEntries.id)).for("update");
    if (rows.length !== new Set(ids).size) throw notFound("Um dos lançamentos não existe.");
    const allowed = action === "approve" ? ["pending"] : ["pending", "approved"];
    const wrong = rows.find((r) => !allowed.includes(r.status));
    if (wrong) throw conflict(action === "approve" ? "Só lançamentos pendentes podem ser aprovados." : "Lançamentos pagos ou já cancelados não podem ser cancelados. Para devolver um valor pago, registre um ajuste negativo.", "invalid_status");
    const now = new Date();
    await tx
      .update(schema.commissionEntries)
      .set(action === "approve" ? { status: "approved", approvedBy: actor.id, approvedAt: now, updatedAt: now } : { status: "cancelled", cancelledBy: actor.id, cancelledAt: now, reason: sql`case when ${schema.commissionEntries.reason} = '' then ${reason} else ${schema.commissionEntries.reason} || ' · Cancelado: ' || ${reason} end`, updatedAt: now })
      .where(inArray(schema.commissionEntries.id, ids));
    for (const r of rows) {
      await audit(
        {
          actor,
          action: action === "approve" ? "alliance.entry.approved" : "alliance.entry.cancelled",
          resourceType: "commission_entry",
          resourceId: r.id,
          summary: action === "approve" ? `Aprovou lançamento de ${formatMoney(r.amountCents)}` : `Cancelou lançamento de ${formatMoney(r.amountCents)}: ${reason}`,
          changes: { status: { before: r.status, after: action === "approve" ? "approved" : "cancelled" } },
          ...ctx,
        },
        tx,
      );
      if (action === "approve") {
        const acc = approvedByPartner.get(r.partnerId) ?? { total: 0, count: 0 };
        approvedByPartner.set(r.partnerId, { total: acc.total + r.amountCents, count: acc.count + 1 });
      }
    }
  });
  for (const [partnerId, acc] of approvedByPartner) {
    if (acc.total <= 0) continue;
    await notifyPartner(
      partnerId,
      { type: "commission", title: "Comissão aprovada", body: `${formatMoney(acc.total)} em ${acc.count === 1 ? "1 lançamento" : `${acc.count} lançamentos`}.`, link: "/alliance/ganhos" },
      { roles: ["owner", "manager"], email: { template: "commission_approved", params: { amountCents: String(acc.total), count: String(acc.count) }, dedupeKey: `commission-approved:${partnerId}:${ids.slice().sort().join(",").slice(0, 120)}` } },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Pagamentos                                                                  */
/* -------------------------------------------------------------------------- */

export async function createPayout(actor: Actor, input: z.infer<typeof payoutInputSchema>, ctx: Ctx) {
  const result = await getDb().transaction(async (tx) => {
    // Clique repetido: devolve o pagamento já registrado com a mesma chave (sem pagar de novo).
    const [existing] = await tx.select().from(schema.partnerPayouts).where(eq(schema.partnerPayouts.idempotencyKey, input.idempotencyKey));
    if (existing) {
      if (existing.partnerId !== input.partnerId) throw conflict("Chave de pagamento já usada.", "idempotency_mismatch");
      return { payout: existing, duplicate: true };
    }
    const ids = [...new Set(input.entryIds)];
    const rows = await tx
      .select()
      .from(schema.commissionEntries)
      .where(and(inArray(schema.commissionEntries.id, ids), eq(schema.commissionEntries.partnerId, input.partnerId)))
      .orderBy(asc(schema.commissionEntries.id))
      .for("update");
    if (rows.length !== ids.length) throw conflict("Algum lançamento não é deste parceiro ou não existe mais.", "invalid_entries");
    const unpaid = rows.find((r) => r.status !== "approved" || r.payoutId !== null);
    if (unpaid) throw conflict("Só lançamentos aprovados e ainda não pagos entram no pagamento. Recarregue a lista.", "invalid_entries");
    const total = rows.reduce((acc, r) => acc + r.amountCents, 0);
    if (total <= 0) throw conflict("O total do pagamento precisa ser positivo (estornos maiores que as comissões ficam para o próximo).", "non_positive");
    if (total !== input.expectedTotalCents) throw conflict(`O total mudou desde que a tela abriu (agora ${formatMoney(total)}). Recarregue e confira.`, "total_mismatch");

    const [payout] = await tx
      .insert(schema.partnerPayouts)
      .values({ partnerId: input.partnerId, amountCents: total, paidOn: input.paidOn, method: input.method, reference: input.reference, notes: input.notes, idempotencyKey: input.idempotencyKey, createdBy: actor.id })
      .returning();
    const now = new Date();
    await tx.update(schema.commissionEntries).set({ status: "paid", payoutId: payout.id, updatedAt: now }).where(inArray(schema.commissionEntries.id, ids));
    await audit({ actor, action: "alliance.payout.registered", resourceType: "partner_payout", resourceId: payout.id, summary: `Registrou pagamento de ${formatMoney(total)} (${ids.length} lançamentos, ${input.method})`, ...ctx }, tx);
    return { payout, duplicate: false };
  });

  if (!result.duplicate) {
    const p = result.payout;
    const paidOn = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${p.paidOn}T12:00:00Z`));
    await notifyPartner(
      p.partnerId,
      { type: "payout", title: "Pagamento registrado", body: `${formatMoney(p.amountCents)} em ${paidOn}.`, link: "/alliance/ganhos" },
      { roles: ["owner", "manager"], email: { template: "payout_registered", params: { amountCents: String(p.amountCents), paidOn, method: p.method }, dedupeKey: `payout:${p.id}` } },
    );
  }
  return { id: result.payout.id, amountCents: result.payout.amountCents, duplicate: result.duplicate };
}

/** Anula um pagamento registrado por engano: os lançamentos voltam a "aprovada" para entrar em outro. */
export async function voidPayout(actor: Actor, id: string, reason: string, ctx: Ctx) {
  await getDb().transaction(async (tx) => {
    const [payout] = await tx.select().from(schema.partnerPayouts).where(eq(schema.partnerPayouts.id, id)).for("update");
    if (!payout) throw notFound("Pagamento não encontrado.");
    if (payout.status === "voided") throw conflict("Este pagamento já foi anulado.", "already_voided");
    const now = new Date();
    await tx.update(schema.partnerPayouts).set({ status: "voided", voidedBy: actor.id, voidedAt: now, voidReason: reason }).where(eq(schema.partnerPayouts.id, id));
    await tx.update(schema.commissionEntries).set({ status: "approved", payoutId: null, updatedAt: now }).where(eq(schema.commissionEntries.payoutId, id));
    await audit({ actor, action: "alliance.payout.voided", resourceType: "partner_payout", resourceId: id, summary: `Anulou o pagamento de ${formatMoney(payout.amountCents)}: ${reason}`, ...ctx }, tx);
  });
}

/* -------------------------------------------------------------------------- */
/* Leitura                                                                     */
/* -------------------------------------------------------------------------- */

const entryColumns = {
  id: schema.commissionEntries.id,
  partnerId: schema.commissionEntries.partnerId,
  kind: schema.commissionEntries.kind,
  status: schema.commissionEntries.status,
  baseCents: schema.commissionEntries.baseCents,
  rateBp: schema.commissionEntries.rateBp,
  amountCents: schema.commissionEntries.amountCents,
  reason: schema.commissionEntries.reason,
  payoutId: schema.commissionEntries.payoutId,
  createdAt: schema.commissionEntries.createdAt,
  approvedAt: schema.commissionEntries.approvedAt,
  referralId: schema.commissionEntries.referralId,
  referralCode: schema.referrals.code,
  companyName: schema.referrals.companyName,
  receivedOn: schema.revenueReceipts.receivedOn,
  receiptKind: schema.revenueReceipts.kind,
  installmentNumber: schema.revenueReceipts.installmentNumber,
};

export async function listEntries(input: { partnerId?: string; status?: string; limit?: number } = {}) {
  const where: SQL[] = [];
  if (input.partnerId) where.push(eq(schema.commissionEntries.partnerId, input.partnerId));
  if (input.status) where.push(eq(schema.commissionEntries.status, input.status));
  return getDb()
    .select({ ...entryColumns, partnerName: schema.partners.tradeName })
    .from(schema.commissionEntries)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.commissionEntries.partnerId))
    .leftJoin(schema.referrals, eq(schema.referrals.id, schema.commissionEntries.referralId))
    .leftJoin(schema.revenueReceipts, eq(schema.revenueReceipts.id, schema.commissionEntries.receiptId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.commissionEntries.createdAt))
    .limit(input.limit ?? 300);
}

export async function listReceipts(input: { referralId?: string; partnerId?: string } = {}) {
  const where: SQL[] = [];
  if (input.referralId) where.push(eq(schema.revenueReceipts.referralId, input.referralId));
  if (input.partnerId) where.push(eq(schema.revenueReceipts.partnerId, input.partnerId));
  const refunded = sql<string>`coalesce((select sum(r2.amount_cents) from revenue_receipts r2 where r2.refund_of = ${schema.revenueReceipts.id}), 0)`;
  return getDb()
    .select({
      id: schema.revenueReceipts.id,
      kind: schema.revenueReceipts.kind,
      installmentNumber: schema.revenueReceipts.installmentNumber,
      amountCents: schema.revenueReceipts.amountCents,
      receivedOn: schema.revenueReceipts.receivedOn,
      description: schema.revenueReceipts.description,
      externalRef: schema.revenueReceipts.externalRef,
      refundOf: schema.revenueReceipts.refundOf,
      refundedCents: refunded,
      referralId: schema.revenueReceipts.referralId,
      referralCode: schema.referrals.code,
      companyName: schema.referrals.companyName,
      partnerName: schema.partners.tradeName,
      createdAt: schema.revenueReceipts.createdAt,
      entryAmountCents: schema.commissionEntries.amountCents,
      entryStatus: schema.commissionEntries.status,
    })
    .from(schema.revenueReceipts)
    .innerJoin(schema.referrals, eq(schema.referrals.id, schema.revenueReceipts.referralId))
    .innerJoin(schema.partners, eq(schema.partners.id, schema.revenueReceipts.partnerId))
    .leftJoin(schema.commissionEntries, eq(schema.commissionEntries.receiptId, schema.revenueReceipts.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.revenueReceipts.receivedOn), desc(schema.revenueReceipts.createdAt))
    .limit(300);
}

export async function listPayouts(input: { partnerId?: string } = {}) {
  return getDb()
    .select({
      id: schema.partnerPayouts.id,
      partnerId: schema.partnerPayouts.partnerId,
      partnerName: schema.partners.tradeName,
      amountCents: schema.partnerPayouts.amountCents,
      paidOn: schema.partnerPayouts.paidOn,
      method: schema.partnerPayouts.method,
      reference: schema.partnerPayouts.reference,
      status: schema.partnerPayouts.status,
      voidReason: schema.partnerPayouts.voidReason,
      createdAt: schema.partnerPayouts.createdAt,
      entries: sql<number>`(select count(*)::int from commission_entries e where e.payout_id = ${schema.partnerPayouts.id})`,
    })
    .from(schema.partnerPayouts)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.partnerPayouts.partnerId))
    .where(input.partnerId ? eq(schema.partnerPayouts.partnerId, input.partnerId) : undefined)
    .orderBy(desc(schema.partnerPayouts.paidOn), desc(schema.partnerPayouts.createdAt))
    .limit(300);
}

/** Saldos por parceiro: pendente, aprovado a pagar e pago. */
export async function balancesByPartner() {
  const rows = await getDb().execute<{ partner_id: string; trade_name: string; pending: string; approved: string; paid: string }>(sql`
    SELECT p.id AS partner_id, p.trade_name,
      coalesce(sum(e.amount_cents) FILTER (WHERE e.status = 'pending'), 0) AS pending,
      coalesce(sum(e.amount_cents) FILTER (WHERE e.status = 'approved'), 0) AS approved,
      coalesce(sum(e.amount_cents) FILTER (WHERE e.status = 'paid'), 0) AS paid
    FROM partners p JOIN commission_entries e ON e.partner_id = p.id
    GROUP BY p.id, p.trade_name ORDER BY p.trade_name`);
  return rows.rows.map((r) => ({ partnerId: r.partner_id, tradeName: r.trade_name, pendingCents: Number(r.pending), approvedCents: Number(r.approved), paidCents: Number(r.paid) }));
}

/* -------------------------------------------------------------------------- */
/* Hub: ganhos da empresa                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Ganhos para o Alliance Hub, sempre da empresa da sessão. "Previstas" é estimativa (contratos ganhos
 * com valor informado e sem recebimento ainda, pela regra vigente hoje) e aparece como tal: não é
 * pagamento garantido.
 */
export async function hubEarnings(partnerId: string, tierKey: string, modalities: string[]) {
  const db = getDb();
  const [totals] = (
    await db.execute<{ pending: string; approved: string; paid: string }>(sql`
      SELECT coalesce(sum(amount_cents) FILTER (WHERE status = 'pending'), 0) AS pending,
             coalesce(sum(amount_cents) FILTER (WHERE status = 'approved'), 0) AS approved,
             coalesce(sum(amount_cents) FILTER (WHERE status = 'paid'), 0) AS paid
      FROM commission_entries WHERE partner_id = ${partnerId}`)
  ).rows;
  const waiting = await db
    .select({ id: schema.referrals.id, code: schema.referrals.code, companyName: schema.referrals.companyName, dealValueCents: schema.referrals.dealValueCents })
    .from(schema.referrals)
    .where(
      and(
        eq(schema.referrals.partnerId, partnerId),
        eq(schema.referrals.status, "won"),
        sql`${schema.referrals.dealValueCents} > 0`,
        sql`NOT EXISTS (SELECT 1 FROM revenue_receipts r WHERE r.referral_id = ${schema.referrals.id})`,
      ),
    );
  const today = new Date().toISOString().slice(0, 10);
  const rule = await resolveRule(db, { partnerId, tierKey, modalities, kind: "one_time", date: today });
  const forecast = rule ? waiting.map((w) => ({ ...w, estimateCents: commissionCents(w.dealValueCents!, rule.rateBp), rateBp: rule.rateBp })) : [];
  const entries = await db
    .select(entryColumns)
    .from(schema.commissionEntries)
    .leftJoin(schema.referrals, eq(schema.referrals.id, schema.commissionEntries.referralId))
    .leftJoin(schema.revenueReceipts, eq(schema.revenueReceipts.id, schema.commissionEntries.receiptId))
    .where(and(eq(schema.commissionEntries.partnerId, partnerId), sql`${schema.commissionEntries.status} <> 'cancelled'`))
    .orderBy(desc(schema.commissionEntries.createdAt))
    .limit(300);
  const payouts = await db
    .select({ id: schema.partnerPayouts.id, amountCents: schema.partnerPayouts.amountCents, paidOn: schema.partnerPayouts.paidOn, method: schema.partnerPayouts.method, reference: schema.partnerPayouts.reference })
    .from(schema.partnerPayouts)
    .where(and(eq(schema.partnerPayouts.partnerId, partnerId), eq(schema.partnerPayouts.status, "registered")))
    .orderBy(desc(schema.partnerPayouts.paidOn));
  return {
    pendingCents: Number(totals.pending),
    approvedCents: Number(totals.approved),
    paidCents: Number(totals.paid),
    forecastCents: forecast.reduce((a, f) => a + f.estimateCents, 0),
    forecast,
    entries,
    payouts,
    currentRateBp: rule?.rateBp ?? null,
  };
}
