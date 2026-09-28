import { roleSchema } from "@/lib/validation/users";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { createRole } from "@/server/users/service";

/** POST /api/cms/roles: cria uma função. Só com permissões que você tem. */
export const POST = authedRoute({ permission: "users.manage_roles" }, async ({ request, user, ip, userAgent }) => {
  const input = await readJson(request, roleSchema, 8 * 1024);
  return json(await createRole(user, input, { ip, userAgent }), 201);
});
