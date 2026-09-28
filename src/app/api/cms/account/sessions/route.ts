import { revokeOtherSessions } from "@/server/cms/account";
import { authedRoute, json } from "@/server/http/handler";

/** DELETE /api/cms/account/sessions: encerra todas as sessões do usuário, menos a atual. */
export const DELETE = authedRoute({ permission: true }, async ({ user, session, ip, userAgent }) => {
  const revoked = await revokeOtherSessions({ id: user.id, email: user.email }, session.id, { ip, userAgent });
  return json({ revoked });
});
