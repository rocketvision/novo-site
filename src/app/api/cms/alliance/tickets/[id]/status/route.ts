import { ticketStatusSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { setTicketStatus } from "@/server/alliance/support";

export const POST = authedRoute<{ id: string }>({ permission: "alliance.communications" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Chamado não encontrado.");
  await setTicketStatus(user, params.id, await readJson(request, ticketStatusSchema), { ip, userAgent });
  return json({ ok: true });
});
