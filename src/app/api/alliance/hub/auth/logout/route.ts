import { cookies } from "next/headers";
import { json, publicRoute } from "@/server/http/handler";
import { deleteHubCookie, HUB_COOKIE, invalidateHubSession, validateHubToken } from "@/server/alliance/hub/session";
import { audit } from "@/server/audit";

/** POST /api/alliance/hub/auth/logout: encerra a sessão do Hub (no servidor e no navegador). */
export const POST = publicRoute({}, async ({ ip, userAgent }) => {
  const token = (await cookies()).get(HUB_COOKIE)?.value;
  const session = token ? await validateHubToken(token) : null;
  if (session) {
    await invalidateHubSession(session.id);
    await audit({ actor: { id: null, email: session.user.email }, action: "alliance.hub.logout", resourceType: "partner_user", resourceId: session.user.id, summary: "Alliance Hub: saiu", ip, userAgent });
  }
  await deleteHubCookie();
  return json({ ok: true });
});
