import { announcementInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { saveAnnouncement } from "@/server/alliance/library";

/** POST /api/cms/alliance/announcements: novo comunicado (rascunho). */
export const POST = authedRoute({ permission: "alliance.communications" }, async ({ request, user, ip, userAgent }) => {
  return json(await saveAnnouncement(user, null, await readJson(request, announcementInputSchema, 32 * 1024), { ip, userAgent }), 201);
});
