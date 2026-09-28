import { authedRoute, json } from "@/server/http/handler";
import { createResetLink } from "@/server/users/service";

/** POST /api/cms/users/:id/reset-link: link de redefinição de senha (1 hora, uso único). */
export const POST = authedRoute<{ id: string }>({ permission: "users.edit" }, async ({ params, user, ip, userAgent }) => {
  return json(await createResetLink(user, params.id, { ip, userAgent }));
});
