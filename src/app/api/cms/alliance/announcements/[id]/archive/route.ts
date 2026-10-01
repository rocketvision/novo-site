import { authedRoute, json } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { archiveAnnouncement } from "@/server/alliance/library";

export const POST = authedRoute<{ id: string }>({ permission: "alliance.communications" }, async ({ params, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Comunicado não encontrado.");
  await archiveAnnouncement(user, params.id, { ip, userAgent });
  return json({ ok: true });
});
