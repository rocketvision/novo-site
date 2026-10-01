import { opportunityInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { saveOpportunity } from "@/server/alliance/library";

export const PUT = authedRoute<{ id: string }>({ permission: "alliance.resources" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Oportunidade não encontrada.");
  return json(await saveOpportunity(user, params.id, await readJson(request, opportunityInputSchema, 32 * 1024), { ip, userAgent }));
});
