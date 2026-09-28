import { updateUserSchema } from "@/lib/validation/users";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { updateUser } from "@/server/users/service";

/** PATCH /api/cms/users/:id: nome e função. Trocar função exige users.manage_roles. */
export const PATCH = authedRoute<{ id: string }>({ permission: "users.edit" }, async ({ request, params, user, ip, userAgent }) => {
  const input = await readJson(request, updateUserSchema, 4 * 1024);
  return json(await updateUser(user, params.id, input, { ip, userAgent }));
});
