import { revokeOwnSession } from "@/server/cms/account";
import { authedRoute, noContent } from "@/server/http/handler";

/** DELETE /api/cms/account/sessions/:id: encerra uma sessão do próprio usuário. 404 se não for dele. */
export const DELETE = authedRoute<{ id: string }>({ permission: true }, async ({ params, user, session, ip, userAgent }) => {
  await revokeOwnSession({ id: user.id, email: user.email }, params.id, session.id, { ip, userAgent });
  return noContent();
});
