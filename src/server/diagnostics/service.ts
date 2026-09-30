import "server-only";
import { and, count, desc, eq, ilike, lt, or, type SQL } from "drizzle-orm";
import { summarize, phoneDigits, maskPhone, statusLabel, type Diagnostic, type DiagnosticStatus } from "@/lib/diagnostic";
import { audit } from "@/server/audit";
import { getDb, isDatabaseConfigured } from "@/server/db";
import { diagnostics, users } from "@/server/db/schema";
import { env } from "@/server/env";
import { notFound } from "@/server/http/errors";
import { sendMail } from "@/server/mail";
import { log } from "@/server/log";

type Actor = { id: string; email: string };
type Meta = { ip?: string | null; userAgent?: string | null };

/**
 * Guarda o diagnóstico e avisa a equipe. O banco é o registro principal (nada se perde); o aviso por
 * e-mail (DIAGNOSTIC_NOTIFY_TO) e o webhook (CONTACT_WEBHOOK_URL) são extras, e uma falha neles não
 * derruba o envio. Sem banco e sem nenhum canal, o envio falha para o visitante saber.
 */
export async function receiveDiagnostic(data: Diagnostic): Promise<{ stored: boolean; notified: boolean }> {
  const whatsapp = phoneDigits(data.whatsapp);
  let stored = false;
  if (isDatabaseConfigured()) {
    await getDb()
      .insert(diagnostics)
      .values({ name: data.name, business: data.business, segment: data.segment, presence: data.presence, problems: data.problems, timing: data.timing, whatsapp, source: data.source ?? null });
    stored = true;
  }

  const subject = `Novo diagnóstico: ${data.business} (${data.name})`;
  const body = [`${data.name} fez o diagnóstico no site.`, "", `Negócio: ${data.business}`, `WhatsApp: ${maskPhone(whatsapp)} (https://wa.me/55${whatsapp})`, summarize(data), data.source ? `\nAberto em: ${data.source}` : ""].join("\n");

  let notified = false;
  if (env.DIAGNOSTIC_NOTIFY_TO) {
    notified = (await sendMail({ to: env.DIAGNOSTIC_NOTIFY_TO, subject, text: body })).delivered || notified;
  }
  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (webhook) {
    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "diagnostic", ...data, whatsapp, receivedAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(10_000),
      });
      notified = response.ok || notified;
    } catch (error) {
      log.error("diagnostic.webhook_failed", { error });
    }
  }
  if (!stored && !notified) log.warn("diagnostic.not_delivered", { business: data.business });
  return { stored, notified };
}

const PAGE = 50;

/** Lista para o CMS, mais recentes primeiro, com filtro por etapa, busca e paginação por data. */
export async function listDiagnostics({ status, q, before }: { status?: DiagnosticStatus; q?: string; before?: Date } = {}) {
  const conditions: SQL[] = [];
  if (status) conditions.push(eq(diagnostics.status, status));
  if (before) conditions.push(lt(diagnostics.createdAt, before));
  const term = q?.trim();
  if (term) {
    const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const digits = term.replace(/\D/g, "");
    conditions.push(or(ilike(diagnostics.name, like), ilike(diagnostics.business, like), ...(digits.length >= 4 ? [ilike(diagnostics.whatsapp, `%${digits}%`)] : []))!);
  }
  const rows = await getDb()
    .select()
    .from(diagnostics)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(diagnostics.createdAt))
    .limit(PAGE + 1);
  const items = rows.slice(0, PAGE);
  return { items, nextBefore: rows.length > PAGE ? items[items.length - 1].createdAt : null };
}

/** Quantos diagnósticos há em cada etapa (para o funil no topo da lista e a visão geral). */
export async function countDiagnosticsByStatus() {
  const rows = await getDb().select({ status: diagnostics.status, total: count() }).from(diagnostics).groupBy(diagnostics.status);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.total)])) as Partial<Record<DiagnosticStatus, number>>;
}

export async function getDiagnostic(id: string) {
  const [row] = await getDb()
    .select({ diagnostic: diagnostics, updatedByName: users.name })
    .from(diagnostics)
    .leftJoin(users, eq(users.id, diagnostics.updatedBy))
    .where(eq(diagnostics.id, id))
    .limit(1);
  return row ?? null;
}

/** Muda a etapa e/ou as anotações, registrando na auditoria o que mudou. */
export async function updateDiagnostic(actor: Actor, id: string, input: { status?: DiagnosticStatus; notes?: string }, meta: Meta = {}) {
  return getDb().transaction(async (tx) => {
    const [current] = await tx.select().from(diagnostics).where(eq(diagnostics.id, id)).for("update");
    if (!current) throw notFound("Diagnóstico não encontrado.");
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    if (input.status !== undefined && input.status !== current.status) changes.status = { before: statusLabel(current.status), after: statusLabel(input.status) };
    if (input.notes !== undefined && input.notes !== current.notes) changes.notes = { before: current.notes, after: input.notes };
    if (Object.keys(changes).length === 0) return current;
    const [updated] = await tx
      .update(diagnostics)
      .set({ ...(input.status !== undefined && { status: input.status }), ...(input.notes !== undefined && { notes: input.notes }), updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(diagnostics.id, id))
      .returning();
    await audit(
      {
        actor,
        action: "diagnostic.update",
        resourceType: "diagnostic",
        resourceId: id,
        summary: changes.status ? `Diagnóstico de ${current.business}: ${changes.status.after}` : `Anotações do diagnóstico de ${current.business}`,
        changes,
        ...meta,
      },
      tx,
    );
    return updated;
  });
}

export async function deleteDiagnostic(actor: Actor, id: string, meta: Meta = {}) {
  await getDb().transaction(async (tx) => {
    const [removed] = await tx.delete(diagnostics).where(eq(diagnostics.id, id)).returning();
    if (!removed) throw notFound("Diagnóstico não encontrado.");
    await audit({ actor, action: "diagnostic.delete", resourceType: "diagnostic", resourceId: id, summary: `Diagnóstico de ${removed.business} excluído`, ...meta }, tx);
  });
}

/** Planilha (CSV, separada por ponto e vírgula, que o Excel em português abre direto) com todos os diagnósticos. */
export async function exportDiagnosticsCsv() {
  const rows = await getDb().select().from(diagnostics).orderBy(desc(diagnostics.createdAt));
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["Data", "Nome", "Negócio", "WhatsApp", "Segmento", "Hoje na internet", "Problemas", "Prazo", "Etapa", "Anotações", "Página"];
  const lines = rows.map((r) =>
    [r.createdAt.toISOString(), r.name, r.business, maskPhone(r.whatsapp), r.segment, r.presence, r.problems.join(", "), r.timing, statusLabel(r.status), r.notes, r.source ?? ""].map(cell).join(";"),
  );
  // BOM: acentos certos no Excel.
  return "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
}
