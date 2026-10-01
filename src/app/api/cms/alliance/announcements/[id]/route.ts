import { announcementInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { saveAnnouncement } from "@/server/alliance/library";

export const PUT = authedRoute<{ id: string }>({ permission: "alliance.communications" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Comunicado não encontrado.");
  return json(await saveAnnouncement(user, params.id, await readJson(request, announcementInputSchema, 32 * 1024), { ip, userAgent }));
});
