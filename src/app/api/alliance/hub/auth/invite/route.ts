import { setPasswordSchema } from "@/lib/validation/auth";
import { json, publicRoute, readJson } from "@/server/http/handler";
import { acceptHubInvite } from "@/server/alliance/hub/auth";
import { setHubCookie } from "@/server/alliance/hub/session";

/** POST /api/alliance/hub/auth/invite: aceita o convite, cria a senha e já entra no Hub. */
export const POST = publicRoute({}, async ({ request, ip, userAgent }) => {
  const session = await acceptHubInvite(await readJson(request, setPasswordSchema, 2 * 1024), { ip, userAgent });
  await setHubCookie(session.token, session.expiresAt);
  return json({ ok: true });
});
