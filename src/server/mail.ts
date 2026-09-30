import "server-only";
import { env, isProduction } from "@/server/env";
import { log } from "@/server/log";

/**
 * Envio de e-mail transacional pela API HTTP do Resend (sem SDK, uma única chamada).
 * Sem RESEND_API_KEY/MAIL_FROM configurados, nada é enviado: em desenvolvimento o link aparece
 * no log para testes; em produção, administradores podem gerar o link pela tela de Usuários.
 */

export type Mail = { to: string; subject: string; text: string; html?: string };

export function isMailConfigured() {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

/** `id`: identificador do envio no Resend (para rastrear a entrega). `error`: motivo curto da falha, sem dados do e-mail. */
export async function sendMail(mail: Mail): Promise<{ delivered: boolean; id?: string; error?: string }> {
  if (!isMailConfigured()) {
    if (isProduction) log.warn("mail.not_configured", { subject: mail.subject });
    else log.info("mail.dev_outbox", { to: mail.to, subject: mail.subject, text: mail.text });
    return { delivered: false, error: "not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      log.error("mail.failed", { status: response.status, subject: mail.subject });
      return { delivered: false, error: `http_${response.status}` };
    }
    const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
    return { delivered: true, ...(typeof body?.id === "string" && { id: body.id }) };
  } catch (error) {
    log.error("mail.failed", { subject: mail.subject, error });
    return { delivered: false, error: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network" };
  }
}
