import { setPasswordSchema } from "@/lib/validation/auth";
import { json, publicRoute, readJson } from "@/server/http/handler";
import { confirmHubPasswordReset } from "@/server/alliance/hub/auth";

/** POST /api/alliance/hub/auth/reset/confirm: nova senha pelo link (encerra todas as sessões). */
export const POST = publicRoute({}, async ({ request, ip, userAgent }) => {
  await confirmHubPasswordReset(await readJson(request, setPasswordSchema, 2 * 1024), { ip, userAgent });
  return json({ ok: true });
});
