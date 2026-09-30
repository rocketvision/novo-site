import { ticketReplySchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { replyAsTeam } from "@/server/alliance/support";

/** POST /api/cms/alliance/tickets/:id: resposta da equipe (avisa a empresa no Hub e por e-mail). */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.communications" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Chamado não encontrado.");
  await replyAsTeam(user, params.id, await readJson(request, ticketReplySchema, 8 * 1024), { ip, userAgent });
  return json({ ok: true });
});
