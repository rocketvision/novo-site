import { loginSchema } from "@/lib/validation/auth";
import { login } from "@/server/auth/service";
import { setSessionCookie, validateSessionToken } from "@/server/auth/session";
import { homePathFor, isSafeInternalPath } from "@/server/authz/guard";
import { json, publicRoute, readJson } from "@/server/http/handler";

/** POST /api/cms/auth/login: 200 com o destino, 401 credenciais inválidas, 429 limite de tentativas. */
export const POST = publicRoute({}, async ({ request, ip, userAgent }) => {
  const input = await readJson(request, loginSchema, 4 * 1024);
  const session = await login(input, { ip, userAgent });
  await setSessionCookie(session.token, session.expiresAt);
  // Sem destino pedido, cada pessoa começa na própria área (o Colunista vai direto para o Blog).
  const home = homePathFor((await validateSessionToken(session.token))?.user.permissions ?? new Set());
  const redirect = input.next && isSafeInternalPath(input.next) && input.next !== "/cms" ? input.next : home;
  return json({ redirect });
});
