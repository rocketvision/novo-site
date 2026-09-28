import { projectVersionSchema } from "@/lib/validation/projects";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { restoreProject } from "@/server/projects/service";

/** POST /api/cms/projects/:id/restore: restaura um arquivado como rascunho. */
export const POST = authedRoute<{ id: string }>({ permission: "projects.archive" }, async ({ request, params, user, ip, userAgent }) => {
  const { version } = await readJson(request, projectVersionSchema, 1024);
  return json(await restoreProject({ id: user.id, email: user.email }, params.id, version, { ip, userAgent }));
});
