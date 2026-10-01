import { emailChangeSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { requestHubEmailChange } from "@/server/alliance/hub/auth";

/** POST /api/alliance/hub/account/email: pede a troca de e-mail (confirmação pelo endereço novo). */
export const POST = hubRoute({}, async ({ request, user, ip, userAgent }) => {
  await requestHubEmailChange(user, await readJson(request, emailChangeSchema, 2 * 1024), { ip, userAgent });
  return json({ ok: true });
});
