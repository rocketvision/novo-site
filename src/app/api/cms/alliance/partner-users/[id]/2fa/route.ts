import { authedRoute, json } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { resetTotpByCms } from "@/server/alliance/hub/auth";

/** DELETE /api/cms/alliance/partner-users/:id/2fa: desativa o 2FA de quem perdeu o acesso (encerra as sessões). */
export const DELETE = authedRoute<{ id: string }>({ permission: "alliance.partners" }, async ({ params, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Pessoa não encontrada.");
  await resetTotpByCms(user, params.id, { ip, userAgent });
  return json({ ok: true });
});
