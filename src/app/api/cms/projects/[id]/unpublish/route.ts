import { projectVersionSchema } from "@/lib/validation/projects";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { unpublishProject } from "@/server/projects/service";

/** POST /api/cms/projects/:id/unpublish: tira do ar e volta a rascunho. A URL pública passa a responder 404. */
export const POST = authedRoute<{ id: string }>({ permission: "projects.publish" }, async ({ request, params, user, ip, userAgent }) => {
  const { version } = await readJson(request, projectVersionSchema, 1024);
  return json(await unpublishProject({ id: user.id, email: user.email }, params.id, version, { ip, userAgent }));
});
