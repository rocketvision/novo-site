import { ruleInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { updateRule } from "@/server/alliance/commissions";

/** PUT /api/cms/alliance/rules/:id: edita uma regra ainda não aprovada. */
export const PUT = authedRoute<{ id: string }>({ permission: "alliance.finance" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Regra não encontrada.");
  await updateRule(user, params.id, await readJson(request, ruleInputSchema), { ip, userAgent });
  return json({ ok: true });
});
