import { authedRoute, json } from "@/server/http/handler";
import { resendInvite } from "@/server/users/service";

/** POST /api/cms/users/:id/invite: novo link de convite (o anterior deixa de valer). */
export const POST = authedRoute<{ id: string }>({ permission: "users.create" }, async ({ params, user, ip, userAgent }) => {
  return json(await resendInvite(user, params.id, { ip, userAgent }));
});
