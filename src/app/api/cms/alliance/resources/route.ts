import { resourceInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { saveResource } from "@/server/alliance/library";

/** POST /api/cms/alliance/resources: novo material do Hub. */
export const POST = authedRoute({ permission: "alliance.resources" }, async ({ request, user, ip, userAgent }) => {
  return json(await saveResource(user, null, await readJson(request, resourceInputSchema, 32 * 1024), { ip, userAgent }), 201);
});
