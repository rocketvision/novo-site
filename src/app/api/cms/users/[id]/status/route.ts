import { userStatusSchema } from "@/lib/validation/users";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { setUserStatus } from "@/server/users/service";

/** POST /api/cms/users/:id/status: ativa ou desativa (desativar encerra as sessões). */
export const POST = authedRoute<{ id: string }>({ permission: "users.disable" }, async ({ request, params, user, ip, userAgent }) => {
  const { status, version } = await readJson(request, userStatusSchema, 1024);
  return json(await setUserStatus(user, params.id, status, version, { ip, userAgent }));
});
