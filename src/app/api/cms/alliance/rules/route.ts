import { ruleInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { createRule } from "@/server/alliance/commissions";

/** POST /api/cms/alliance/rules: nova regra de comissão (entra aguardando aprovação). */
export const POST = authedRoute({ permission: "alliance.finance" }, async ({ request, user, ip, userAgent }) => {
  const input = await readJson(request, ruleInputSchema);
  return json(await createRule(user, input, { ip, userAgent }), 201);
});
