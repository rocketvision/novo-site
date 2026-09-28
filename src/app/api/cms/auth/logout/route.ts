import { audit } from "@/server/audit";
import { deleteSessionCookie, invalidateSession } from "@/server/auth/session";
import { authedRoute, noContent } from "@/server/http/handler";

/** POST /api/cms/auth/logout: 204 e sessão removida do banco (não só o cookie). */
export const POST = authedRoute({ permission: true, rateLimit: false }, async ({ session, user, ip, userAgent }) => {
  await invalidateSession(session.id);
  await deleteSessionCookie();
  await audit({ actor: { id: user.id, email: user.email }, action: "auth.logout", resourceType: "user", resourceId: user.id, summary: "Logout", ip, userAgent });
  return noContent();
});
