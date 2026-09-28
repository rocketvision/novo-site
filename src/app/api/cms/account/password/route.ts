import { changePasswordSchema } from "@/lib/validation/auth";
import { changeOwnPassword } from "@/server/auth/service";
import { authedRoute, noContent, readJson } from "@/server/http/handler";

/** POST /api/cms/account/password: 204, ou 422 se a senha atual estiver errada ou a nova for fraca. */
export const POST = authedRoute({ permission: true }, async ({ request, user, session, ip, userAgent }) => {
  const input = await readJson(request, changePasswordSchema, 4 * 1024);
  await changeOwnPassword({ userId: user.id, sessionId: session.id, ...input }, { ip, userAgent });
  return noContent();
});
