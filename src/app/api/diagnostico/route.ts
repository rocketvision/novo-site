import { diagnosticSchema } from "@/lib/diagnostic";
import { json, publicRoute, readJson } from "@/server/http/handler";
import { HttpError } from "@/server/http/errors";
import { receiveDiagnostic } from "@/server/diagnostics/service";
import { enforce, POLICIES } from "@/server/security/rate-limit";
import { log } from "@/server/log";

/** Honeypot: o campo invisível do quiz. Pessoas não o preenchem; bots, sim. */
const withHoneypot = diagnosticSchema.extend({ website: diagnosticSchema.shape.source });

/**
 * Recebe o diagnóstico (o quiz de 7 perguntas do site), guarda no banco e avisa a equipe.
 *
 * Proteções: só aceita a mesma origem (CSRF), JSON de até 8 KB, limite por IP e teto geral por hora,
 * validação estrita das respostas (só opções conhecidas) e campo invisível contra robôs.
 * Devolve `id` e `token` (só para quem enviou), que permitem agendar a call por este diagnóstico.
 */
export const POST = publicRoute({ rateLimit: { policy: POLICIES.diagnosticByIp, by: "ip" } }, async ({ request }) => {
  await enforce(POLICIES.diagnosticGlobal, "all");
  const { website, ...data } = await readJson(request, withHoneypot, 8 * 1024);
  // Bot: finge que deu certo e não grava nada.
  if (website) return json({ ok: true });

  try {
    const { stored, notified, id, token } = await receiveDiagnostic(data);
    if (!stored && !notified) throw new HttpError(503, "not_configured", "Não foi possível enviar agora.");
    return json({ ok: true, id, token });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    log.error("diagnostic.failed", { error });
    throw new HttpError(502, "delivery_failed", "Não foi possível enviar agora. Tente de novo em instantes.");
  }
});
