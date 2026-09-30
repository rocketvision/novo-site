import { changePasswordSchema } from "@/lib/validation/auth";
import { json, readJson } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { changeHubPassword } from "@/server/alliance/hub/auth";

/** POST /api/alliance/hub/account/password: troca de senha (exige a atual; encerra as outras sessões). */
export const POST = hubRoute({}, async ({ request, user, session, ip, userAgent }) => {
  await changeHubPassword(user, session.id, await readJson(request, changePasswordSchema, 2 * 1024), { ip, userAgent });
  return json({ ok: true });
});
