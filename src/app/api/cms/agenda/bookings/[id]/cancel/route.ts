import { z } from "zod";
import { authedRoute, json } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { cancelBooking } from "@/server/calendar/bookings";

/** POST /api/cms/agenda/bookings/:id/cancel: cancela a call e remove o evento do Google Calendar. */
export const POST = authedRoute<{ id: string }>({ permission: "diagnostics.manage" }, async ({ params, user, ip, userAgent }) => {
  if (!z.string().uuid().safeParse(params.id).success) throw notFound("Call não encontrada.");
  await cancelBooking(user, params.id, { ip, userAgent });
  return json({ ok: true });
});
