import { setPasswordSchema } from "@/lib/validation/auth";
import { consumeToken } from "@/server/auth/service";
import { json, publicRoute, readJson } from "@/server/http/handler";

/** POST /api/cms/auth/password-reset/confirm: 200, 410 link expirado/usado, 422 senha fraca, 429. */
export const POST = publicRoute({}, async ({ request, ip, userAgent }) => {
  const input = await readJson(request, setPasswordSchema, 4 * 1024);
  await consumeToken(input, "password_reset", { ip, userAgent });
  return json({ redirect: "/cms/login?senha=redefinida" });
});
