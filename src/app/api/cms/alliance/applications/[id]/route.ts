import { applicationDecisionSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { decideApplication } from "@/server/alliance/applications";

/** POST /api/cms/alliance/applications/:id: aprovar, recusar, pedir informações ou anotar. */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.applications" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Candidatura não encontrada.");
  const input = await readJson(request, applicationDecisionSchema, 16 * 1024);
  const result = await decideApplication(user, params.id, input, { ip, userAgent });
  return json(result);
});
