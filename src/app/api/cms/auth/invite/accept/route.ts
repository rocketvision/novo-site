import { setPasswordSchema } from "@/lib/validation/auth";
import { consumeToken } from "@/server/auth/service";
import { json, publicRoute, readJson } from "@/server/http/handler";

/** POST /api/cms/auth/invite/accept: define a senha e ativa a conta convidada. */
export const POST = publicRoute({}, async ({ request, ip, userAgent }) => {
  const input = await readJson(request, setPasswordSchema, 4 * 1024);
  await consumeToken(input, "invite", { ip, userAgent });
  return json({ redirect: "/cms/login?convite=aceito" });
});
