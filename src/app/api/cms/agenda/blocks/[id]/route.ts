import { z } from "zod";
import { authedRoute, json } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { deleteBlock } from "@/server/calendar/bookings";

/** DELETE /api/cms/agenda/blocks/:id: libera de novo o horário bloqueado. */
export const DELETE = authedRoute<{ id: string }>({ permission: "diagnostics.manage" }, async ({ params, user, ip, userAgent }) => {
  if (!z.string().uuid().safeParse(params.id).success) throw notFound("Bloqueio não encontrado.");
  await deleteBlock(user, params.id, { ip, userAgent });
  return json({ ok: true });
});
