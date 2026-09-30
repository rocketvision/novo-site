import { authedRoute, json } from "@/server/http/handler";
import { conflict, notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { retryEmail } from "@/server/alliance/mail";
import { audit } from "@/server/audit";

/** POST /api/cms/alliance/emails/:id/retry: reenvia um e-mail do programa que falhou. */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.communications" }, async ({ params, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Envio não encontrado.");
  const status = await retryEmail(params.id);
  if (!status) throw conflict("Este e-mail não pode ser reenviado (já foi entregue ou tem link de uso único: gere um novo).", "not_retryable");
  await audit({ actor: user, action: "alliance.email.retried", resourceType: "alliance_email", resourceId: params.id, summary: `Reenviou um e-mail do programa (${status})`, ip, userAgent });
  return json({ status });
});
