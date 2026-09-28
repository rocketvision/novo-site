import { createProjectSchema, projectListQuerySchema } from "@/lib/validation/projects";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { unprocessable } from "@/server/http/errors";
import { createProject, listProjects } from "@/server/projects/service";

/** GET /api/cms/projects?q=&status=: lista para o CMS. */
export const GET = authedRoute({ permission: "projects.view" }, async ({ request }) => {
  const parsed = projectListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) throw unprocessable(parsed.error.issues);
  return json({ projects: await listProjects(parsed.data) });
});

/** POST /api/cms/projects: cria como rascunho. 201, 409 endereço em uso, 422 dados inválidos. */
export const POST = authedRoute({ permission: "projects.create" }, async ({ request, user, ip, userAgent }) => {
  const { data } = await readJson(request, createProjectSchema, 64 * 1024);
  const project = await createProject({ id: user.id, email: user.email }, data, { ip, userAgent });
  return json(project, 201);
});
