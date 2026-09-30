import "server-only";
import { desc, eq, isNull } from "drizzle-orm";
import { summarize, phoneDigits, maskPhone, type Diagnostic } from "@/lib/diagnostic";
import { getDb, isDatabaseConfigured } from "@/server/db";
import { diagnostics } from "@/server/db/schema";
import { env } from "@/server/env";
import { sendMail } from "@/server/mail";
import { log } from "@/server/log";

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

/** Lista para o CMS: os mais recentes primeiro; `pending` mostra só os que ainda não tiveram retorno. */
export async function listDiagnostics({ pending = false, limit = 200 }: { pending?: boolean; limit?: number } = {}) {
  const db = getDb();
  const query = db.select().from(diagnostics);
  return (pending ? query.where(isNull(diagnostics.handledAt)) : query).orderBy(desc(diagnostics.createdAt)).limit(limit);
}

/** Marca (ou desmarca) um diagnóstico como respondido. */
export async function setDiagnosticHandled(id: string, handled: boolean) {
  await getDb()
    .update(diagnostics)
    .set({ handledAt: handled ? new Date() : null })
    .where(eq(diagnostics.id, id));
}
