import { changeRequestDecisionSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { decideChangeRequest } from "@/server/alliance/partners";

/** POST /api/cms/alliance/change-requests/:id: aprova (aplica e republica se estiver no ar) ou recusa. */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.partners" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Pedido não encontrado.");
  const { action, note } = await readJson(request, changeRequestDecisionSchema);
  await decideChangeRequest(user, params.id, action, note, { ip, userAgent });
  return json({ ok: true });
});
