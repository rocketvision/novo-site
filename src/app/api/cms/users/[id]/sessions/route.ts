import { authedRoute, json } from "@/server/http/handler";
import { revokeUserSessions } from "@/server/users/service";

/** DELETE /api/cms/users/:id/sessions: encerra todas as sessões de outra pessoa. */
export const DELETE = authedRoute<{ id: string }>({ permission: "users.edit" }, async ({ params, user, ip, userAgent }) => {
  return json(await revokeUserSessions(user, params.id, { ip, userAgent }));
});
