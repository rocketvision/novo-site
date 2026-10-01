import { partnerSelfEditSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { requestPublicChange } from "@/server/alliance/company";

/** POST /api/alliance/hub/company/changes: pede alteração dos dados públicos (vale só depois da aprovação). */
export const POST = hubRoute({ permission: "company.edit" }, async ({ request, user, ip, userAgent }) => {
  return json(await requestPublicChange(user, await readJson(request, partnerSelfEditSchema, 32 * 1024), { ip, userAgent }), 201);
});
