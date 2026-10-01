import { ticketReplySchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { hubRoute } from "@/server/alliance/hub/handler";
import { replyAsPartner } from "@/server/alliance/support";

/** POST /api/alliance/hub/support/:id: responde (e opcionalmente encerra) um chamado da própria empresa. */
export const POST = hubRoute<{ id: string }>({ permission: "support.use" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Chamado não encontrado.");
  await replyAsPartner(user, params.id, await readJson(request, ticketReplySchema, 8 * 1024), { ip, userAgent });
  return json({ ok: true });
});
