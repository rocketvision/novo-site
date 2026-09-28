import { projectVersionSchema } from "@/lib/validation/projects";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { publishProject } from "@/server/projects/service";

/** POST /api/cms/projects/:id/publish: publica a cópia de trabalho (primeira publicação ou alterações). 409 se desatualizado, 422 se faltar imagem. */
export const POST = authedRoute<{ id: string }>({ permission: "projects.publish" }, async ({ request, params, user, ip, userAgent }) => {
  const { version } = await readJson(request, projectVersionSchema, 1024);
  return json(await publishProject({ id: user.id, email: user.email }, params.id, version, { ip, userAgent }));
});
