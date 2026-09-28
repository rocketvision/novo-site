import { profileSchema } from "@/lib/validation/auth";
import { updateOwnProfile } from "@/server/cms/account";
import { authedRoute, noContent, readJson } from "@/server/http/handler";

/** PATCH /api/cms/account: atualiza o próprio nome. O e-mail e a função só mudam pela gestão de usuários. */
export const PATCH = authedRoute({ permission: true }, async ({ request, user, ip, userAgent }) => {
  const input = await readJson(request, profileSchema, 4 * 1024);
  await updateOwnProfile({ id: user.id, email: user.email }, input, { ip, userAgent });
  return noContent();
});
