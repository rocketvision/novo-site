import { deleteProjectSchema, updateProjectSchema } from "@/lib/validation/projects";
import { authedRoute, json, noContent, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { deleteProject, getProject, updateProject } from "@/server/projects/service";

type Params = { id: string };

/** GET /api/cms/projects/:id: cópia de trabalho e versão. */
export const GET = authedRoute<Params>({ permission: "projects.view" }, async ({ params }) => {
  const project = await getProject(params.id);
  if (!project) throw notFound("Projeto não encontrado.");
  return json({ version: project.row.version, status: project.row.status, data: project.input });
});

/** PUT /api/cms/projects/:id: salva a cópia de trabalho. O site só muda ao publicar. */
export const PUT = authedRoute<Params>({ permission: "projects.edit" }, async ({ request, params, user, ip, userAgent }) => {
  const { version, data } = await readJson(request, updateProjectSchema, 64 * 1024);
  return json(await updateProject({ id: user.id, email: user.email }, params.id, data, version, { ip, userAgent }));
});

/** DELETE /api/cms/projects/:id: exclusão definitiva de um projeto arquivado, com o endereço digitado. */
export const DELETE = authedRoute<Params>({ permission: "projects.delete" }, async ({ request, params, user, ip, userAgent }) => {
  const { version, confirmSlug } = await readJson(request, deleteProjectSchema, 1024);
  await deleteProject({ id: user.id, email: user.email }, params.id, version, confirmSlug, { ip, userAgent });
  return noContent();
});
