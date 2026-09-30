import { authedRoute, json } from "@/server/http/handler";
import { removeConnection } from "@/server/calendar/bookings";

/** DELETE /api/cms/google: desconecta o Google Calendar (e revoga o acesso no Google). */
export const DELETE = authedRoute({ permission: "settings.edit" }, async ({ user, ip, userAgent }) => {
  await removeConnection(user, { ip, userAgent });
  return json({ ok: true });
});
