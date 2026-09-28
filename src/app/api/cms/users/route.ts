import { inviteUserSchema } from "@/lib/validation/users";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { inviteUser, listUsers } from "@/server/users/service";

/** GET /api/cms/users: lista (sem hashes, tokens ou qualquer dado de senha). */
export const GET = authedRoute({ permission: "users.view" }, async () => json({ users: await listUsers() }));

/**
 * POST /api/cms/users: convida. 201 com o link de convite quando o e-mail não foi enviado,
 * para ser repassado por outro canal. 409 se o e-mail já existe; 403 se a função tiver permissões que você não tem.
 */
export const POST = authedRoute({ permission: "users.create" }, async ({ request, user, ip, userAgent }) => {
  const input = await readJson(request, inviteUserSchema, 4 * 1024);
  return json(await inviteUser(user, input, { ip, userAgent }), 201);
});
