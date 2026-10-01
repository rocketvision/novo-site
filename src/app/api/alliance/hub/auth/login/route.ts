import { hubLoginSchema } from "@/lib/alliance/validation";
import { json, publicRoute, readJson } from "@/server/http/handler";
import { hubLogin } from "@/server/alliance/hub/auth";
import { setHubCookie } from "@/server/alliance/hub/session";

/**
 * POST /api/alliance/hub/auth/login: login do Alliance Hub. Com 2FA ativo, devolve o desafio do
 * segundo passo (sem sessão). Mesma resposta para e-mail inexistente e senha errada.
 */
export const POST = publicRoute({}, async ({ request, ip, userAgent }) => {
  const input = await readJson(request, hubLoginSchema, 4 * 1024);
  const result = await hubLogin(input, { ip, userAgent });
  if (result.kind === "two_factor") return json({ twoFactor: true, challenge: result.challenge });
  await setHubCookie(result.token, result.expiresAt);
  return json({ ok: true });
});
