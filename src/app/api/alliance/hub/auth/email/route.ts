import { z } from "zod";
import { json, publicRoute, readJson } from "@/server/http/handler";
import { confirmHubEmailChange } from "@/server/alliance/hub/auth";

/** POST /api/alliance/hub/auth/email: confirma a troca de e-mail pelo link enviado ao endereço novo. */
export const POST = publicRoute({}, async ({ request, ip, userAgent }) => {
  const { token } = await readJson(request, z.object({ token: z.string().max(100) }), 1024);
  await confirmHubEmailChange(token, { ip, userAgent });
  return json({ ok: true });
});
