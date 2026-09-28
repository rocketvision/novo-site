import { roleSchema } from "@/lib/validation/users";
import { authedRoute, noContent, readJson } from "@/server/http/handler";
import { deleteRole, updateRole } from "@/server/users/service";

type Params = { id: string };

/** PUT /api/cms/roles/:id: nome, descrição e permissões (funções de sistema: 403). */
export const PUT = authedRoute<Params>({ permission: "users.manage_roles" }, async ({ request, params, user, ip, userAgent }) => {
  const input = await readJson(request, roleSchema, 8 * 1024);
  await updateRole(user, params.id, input, { ip, userAgent });
  return noContent();
});

/** DELETE /api/cms/roles/:id: só funções sem usuários. */
export const DELETE = authedRoute<Params>({ permission: "users.manage_roles" }, async ({ params, user, ip, userAgent }) => {
  await deleteRole(user, params.id, { ip, userAgent });
  return noContent();
});
