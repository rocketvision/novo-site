import { payoutVoidSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { voidPayout } from "@/server/alliance/commissions";

/** POST /api/cms/alliance/payouts/:id/void: anula um pagamento registrado por engano. */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.finance" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Pagamento não encontrado.");
  const { reason } = await readJson(request, payoutVoidSchema);
  await voidPayout(user, params.id, reason, { ip, userAgent });
  return json({ ok: true });
});
