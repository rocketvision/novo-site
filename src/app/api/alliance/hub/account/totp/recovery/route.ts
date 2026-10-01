import { totpDisableSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { regenerateRecoveryCodes } from "@/server/alliance/hub/auth";

/** POST /api/alliance/hub/account/totp/recovery: novos códigos de recuperação (os antigos deixam de valer). */
export const POST = hubRoute({}, async ({ request, user, ip, userAgent }) => {
  const { password } = await readJson(request, totpDisableSchema, 1024);
  return json(await regenerateRecoveryCodes(user, password, { ip, userAgent }));
});
