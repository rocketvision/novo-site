import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { getDb, schema } from "@/server/db";
import { audit, diff } from "@/server/audit";
import { conflict, forbidden, HttpError, notFound } from "@/server/http/errors";
import { hubCan } from "@/lib/alliance/constants";
import type { contractInputSchema } from "@/lib/alliance/validation";
import { notifyPartner } from "./notify";
import type { HubUser } from "./hub/session";

type Actor = { id: string; email: string };
type Ctx = { ip: string | null; userAgent: string | null };

/**
 * Contratos e termos de parceria.
 *
 * Fluxo: rascunho → enviado (aguardando aceite no Hub) → vigente → vencido/encerrado.
 * Enviar congela o texto: o hash SHA-256 dele é calculado e o texto não muda mais. O aceite registra
 * pessoa, data, IP, navegador e o hash do texto aceito (prova de qual versão foi aceita).
 * Mudou o texto? Nova versão (o número sobe e a anterior fica no histórico).
 */

const sha = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

type ContractInput = z.infer<typeof contractInputSchema>;

export async function listContracts(input: { partnerId?: string } = {}) {
  return getDb()
    .select({ contract: schema.partnerContracts, partnerName: schema.partners.tradeName, acceptedByName: schema.partnerUsers.name, filename: schema.allianceFiles.filename })
    .from(schema.partnerContracts)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.partnerContracts.partnerId))
    .leftJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.partnerContracts.acceptedBy))
    .leftJoin(schema.allianceFiles, eq(schema.allianceFiles.id, schema.partnerContracts.fileId))
    .where(input.partnerId ? eq(schema.partnerContracts.partnerId, input.partnerId) : undefined)
    .orderBy(desc(schema.partnerContracts.createdAt))
    .limit(300);
}

export async function getContract(id: string) {
  const [row] = await getDb()
    .select({ contract: schema.partnerContracts, partnerName: schema.partners.tradeName, acceptedByName: schema.partnerUsers.name, filename: schema.allianceFiles.filename })
    .from(schema.partnerContracts)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.partnerContracts.partnerId))
    .leftJoin(schema.partnerUsers, eq(schema.partnerUsers.id, schema.partnerContracts.acceptedBy))
    .leftJoin(schema.allianceFiles, eq(schema.allianceFiles.id, schema.partnerContracts.fileId))
    .where(eq(schema.partnerContracts.id, id));
  return row ?? null;
}

/** Cria (nova versão do tipo para o parceiro) ou edita um rascunho. */
export async function saveContract(actor: Actor, id: string | null, input: ContractInput, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    if (!id) {
      const [{ next }] = await tx
        .select({ next: sql<number>`coalesce(max(${schema.partnerContracts.version}), 0) + 1` })
        .from(schema.partnerContracts)
        .where(and(eq(schema.partnerContracts.partnerId, input.partnerId), eq(schema.partnerContracts.kind, input.kind)));
      const [row] = await tx.insert(schema.partnerContracts).values({ ...input, version: next, createdBy: actor.id }).returning({ id: schema.partnerContracts.id });
      await audit({ actor, action: "alliance.contract.created", resourceType: "partner_contract", resourceId: row.id, summary: `Criou "${input.title}" (versão ${next})`, ...ctx }, tx);
      return row;
    }
    const [before] = await tx.select().from(schema.partnerContracts).where(eq(schema.partnerContracts.id, id)).for("update");
    if (!before) throw notFound("Contrato não encontrado.");
    if (before.status !== "draft") throw conflict("Só rascunhos podem ser editados. Para mudar um termo enviado, crie uma nova versão.", "locked");
    if (before.partnerId !== input.partnerId || before.kind !== input.kind) throw conflict("Parceiro e tipo não mudam depois de criados.", "locked");
    await tx.update(schema.partnerContracts).set({ ...input, updatedAt: new Date() }).where(eq(schema.partnerContracts.id, id));
    await audit({ actor, action: "alliance.contract.updated", resourceType: "partner_contract", resourceId: id, summary: `Editou "${input.title}"`, changes: diff(before, { ...before, ...input }), ...ctx }, tx);
    return { id };
  });
}

const TRANSITIONS: Record<string, { from: string[]; to: string; label: string }> = {
  send: { from: ["draft"], to: "sent", label: "Enviou para aceite" },
  activate: { from: ["sent", "draft"], to: "active", label: "Marcou como vigente (aceite fora do Hub)" },
  terminate: { from: ["sent", "active"], to: "terminated", label: "Encerrou" },
  expire: { from: ["active"], to: "expired", label: "Marcou como vencido" },
  back_to_draft: { from: ["sent"], to: "draft", label: "Voltou para rascunho" },
};

export async function changeContractStatus(actor: Actor, id: string, action: keyof typeof TRANSITIONS, ctx: Ctx) {
  const t = TRANSITIONS[action];
  const result = await getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(schema.partnerContracts).where(eq(schema.partnerContracts.id, id)).for("update");
    if (!row) throw notFound("Contrato não encontrado.");
    if (!t.from.includes(row.status)) throw conflict("Esta mudança não é possível na situação atual.", "invalid_transition");
    if (action === "send" && !row.terms && !row.fileId) throw new HttpError(422, "validation_failed", "Escreva o texto do termo ou anexe o documento antes de enviar.");
    const now = new Date();
    await tx
      .update(schema.partnerContracts)
      .set({
        status: t.to,
        ...(action === "send" && { sentAt: now, termsSha256: sha(row.terms) }),
        ...(action === "activate" && !row.termsSha256 && { termsSha256: sha(row.terms) }),
        ...(action === "back_to_draft" && { sentAt: null, termsSha256: null }),
        updatedAt: now,
      })
      .where(eq(schema.partnerContracts.id, id));
    await audit({ actor, action: `alliance.contract.${action}`, resourceType: "partner_contract", resourceId: id, summary: `${t.label}: "${row.title}" v${row.version}`, changes: { status: { before: row.status, after: t.to } }, ...ctx }, tx);
    return row;
  });
  if (action === "send") {
    await notifyPartner(
      result.partnerId,
      { type: "contract", title: `Termo para aceite: ${result.title}`, body: "Leia e aceite no Alliance Hub.", link: "/alliance/empresa#contratos" },
      { roles: ["owner"], email: { template: "contract_sent", params: { title: result.title }, dedupeKey: `contract-sent:${id}:${result.version}` } },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Hub                                                                         */
/* -------------------------------------------------------------------------- */

export async function hubContracts(user: HubUser) {
  if (!hubCan(user.role, "contracts.view")) return [];
  return getDb()
    .select({
      id: schema.partnerContracts.id,
      title: schema.partnerContracts.title,
      kind: schema.partnerContracts.kind,
      version: schema.partnerContracts.version,
      status: schema.partnerContracts.status,
      startsOn: schema.partnerContracts.startsOn,
      endsOn: schema.partnerContracts.endsOn,
      terms: schema.partnerContracts.terms,
      commercialTerms: schema.partnerContracts.commercialTerms,
      hasFile: sql<boolean>`${schema.partnerContracts.fileId} IS NOT NULL`,
      sentAt: schema.partnerContracts.sentAt,
      acceptedAt: schema.partnerContracts.acceptedAt,
      acceptedName: schema.partnerContracts.acceptedName,
      termsSha256: schema.partnerContracts.termsSha256,
    })
    .from(schema.partnerContracts)
    .where(and(eq(schema.partnerContracts.partnerId, user.partner.id), inArray(schema.partnerContracts.status, ["sent", "active", "expired", "terminated"])))
    .orderBy(desc(schema.partnerContracts.createdAt));
}

/**
 * Aceite pelo Responsável. Confere que o texto é o mesmo que foi enviado (hash): se a versão que a
 * pessoa leu não for a atual, recusa e pede para recarregar.
 */
export async function acceptContract(user: HubUser, id: string, seenHash: string, ctx: Ctx) {
  if (!hubCan(user.role, "contracts.accept")) throw forbidden("Só o Responsável aceita termos em nome da empresa.");
  await getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(schema.partnerContracts).where(and(eq(schema.partnerContracts.id, id), eq(schema.partnerContracts.partnerId, user.partner.id))).for("update");
    if (!row) throw notFound("Documento não encontrado.");
    if (row.status !== "sent") throw conflict("Este documento não está aguardando aceite.", "invalid_status");
    if (!row.termsSha256 || row.termsSha256 !== seenHash) throw conflict("O texto do documento mudou. Recarregue a página e leia de novo.", "stale");
    const now = new Date();
    await tx
      .update(schema.partnerContracts)
      .set({ status: "active", acceptedAt: now, acceptedBy: user.id, acceptedName: user.name, acceptedIp: ctx.ip, acceptedUserAgent: ctx.userAgent, updatedAt: now })
      .where(eq(schema.partnerContracts.id, id));
    await audit({ actor: { id: null, email: user.email }, action: "alliance.hub.contract_accepted", resourceType: "partner_contract", resourceId: id, summary: `${user.name} aceitou "${row.title}" v${row.version} em nome da ${user.partner.tradeName}`, ...ctx }, tx);
  });
}

/** Arquivo do contrato, só da empresa da sessão e só para quem pode ver contratos. */
export async function hubContractFile(user: HubUser, id: string) {
  if (!hubCan(user.role, "contracts.view")) throw notFound("Documento não encontrado.");
  const [row] = await getDb().select({ fileId: schema.partnerContracts.fileId, status: schema.partnerContracts.status }).from(schema.partnerContracts).where(and(eq(schema.partnerContracts.id, id), eq(schema.partnerContracts.partnerId, user.partner.id)));
  if (!row?.fileId || row.status === "draft") throw notFound("Documento não encontrado.");
  return row.fileId;
}
