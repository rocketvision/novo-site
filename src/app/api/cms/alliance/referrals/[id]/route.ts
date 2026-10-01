import { referralUpdateSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { updateReferral } from "@/server/alliance/referrals";

/** PATCH /api/cms/alliance/referrals/:id: status, observação, responsável, valor, reatribuição e proteção. */
export const PATCH = authedRoute<{ id: string }>({ permission: "alliance.referrals" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Indicação não encontrada.");
  const input = await readJson(request, referralUpdateSchema, 16 * 1024);
  return json(await updateReferral(user, params.id, input, { ip, userAgent }));
});
