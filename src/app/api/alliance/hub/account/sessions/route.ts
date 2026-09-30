import { json } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { invalidateHubUserSessions } from "@/server/alliance/hub/session";
import { audit } from "@/server/audit";

/** DELETE /api/alliance/hub/account/sessions: sai de todos os outros dispositivos. */
export const DELETE = hubRoute({}, async ({ user, session, ip, userAgent }) => {
  const revoked = await invalidateHubUserSessions(user.id, session.id);
  await audit({ actor: { id: null, email: user.email }, action: "alliance.hub.sessions_revoked", resourceType: "partner_user", resourceId: user.id, summary: `Alliance Hub: encerrou ${revoked} outra(s) sessão(ões)`, ip, userAgent });
  return json({ revoked });
});
