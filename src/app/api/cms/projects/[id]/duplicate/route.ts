import { authedRoute, json } from "@/server/http/handler";
import { duplicateProject } from "@/server/projects/service";

/** POST /api/cms/projects/:id/duplicate: cria uma cópia em rascunho, com endereço livre. */
export const POST = authedRoute<{ id: string }>({ permission: "projects.create" }, async ({ params, user, ip, userAgent }) => {
  return json(await duplicateProject({ id: user.id, email: user.email }, params.id, { ip, userAgent }), 201);
});
