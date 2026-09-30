import { authedRoute, json } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { publishAnnouncement } from "@/server/alliance/library";

/** POST /api/cms/alliance/announcements/:id/publish: publica (avisos no Hub; importante também por e-mail). */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.communications" }, async ({ params, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Comunicado não encontrado.");
  return json(await publishAnnouncement(user, params.id, { ip, userAgent }));
});
