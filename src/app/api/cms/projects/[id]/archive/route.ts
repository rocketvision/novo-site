import { projectVersionSchema } from "@/lib/validation/projects";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { archiveProject } from "@/server/projects/service";

/** POST /api/cms/projects/:id/archive: arquiva (e tira do ar, se estiver publicado). */
export const POST = authedRoute<{ id: string }>({ permission: "projects.archive" }, async ({ request, params, user, ip, userAgent }) => {
  const { version } = await readJson(request, projectVersionSchema, 1024);
  return json(await archiveProject({ id: user.id, email: user.email }, params.id, version, { ip, userAgent }));
});
