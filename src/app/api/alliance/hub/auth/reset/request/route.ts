import { resetRequestSchema } from "@/lib/validation/auth";
import { json, publicRoute, readJson } from "@/server/http/handler";
import { requestHubPasswordReset } from "@/server/alliance/hub/auth";

/** POST /api/alliance/hub/auth/reset/request: sempre a mesma resposta (sem revelar se o e-mail existe). */
export const POST = publicRoute({}, async ({ request, ip, userAgent }) => {
  const { email } = await readJson(request, resetRequestSchema, 2 * 1024);
  await requestHubPasswordReset(email, { ip, userAgent });
  return json({ ok: true });
});
