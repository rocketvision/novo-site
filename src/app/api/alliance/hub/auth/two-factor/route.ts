import { hubTwoFactorSchema } from "@/lib/alliance/validation";
import { json, publicRoute, readJson } from "@/server/http/handler";
import { hubVerifyTwoFactor } from "@/server/alliance/hub/auth";
import { setHubCookie } from "@/server/alliance/hub/session";

/** POST /api/alliance/hub/auth/two-factor: segundo passo do login (código do app ou de recuperação). */
export const POST = publicRoute({}, async ({ request, ip, userAgent }) => {
  const input = await readJson(request, hubTwoFactorSchema, 2 * 1024);
  const session = await hubVerifyTwoFactor(input, { ip, userAgent });
  await setHubCookie(session.token, session.expiresAt);
  return json({ ok: true });
});
