import { opportunityInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { saveOpportunity } from "@/server/alliance/library";

/** POST /api/cms/alliance/opportunities: nova oportunidade (aberta: avisa as empresas elegíveis). */
export const POST = authedRoute({ permission: "alliance.resources" }, async ({ request, user, ip, userAgent }) => {
  return json(await saveOpportunity(user, null, await readJson(request, opportunityInputSchema, 32 * 1024), { ip, userAgent }), 201);
});
