import { partnerInviteSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { invitePartnerUser } from "@/server/alliance/hub/auth";

/**
 * POST /api/cms/alliance/partners/:id/users: convida uma pessoa da empresa para o Alliance Hub
 * (também reenvia o convite de quem ainda não aceitou). Sem e-mail configurado, devolve o link.
 */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.partners" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Parceiro não encontrado.");
  const input = await readJson(request, partnerInviteSchema);
  return json(await invitePartnerUser({ kind: "cms", actor: user }, params.id, input, { ip, userAgent }), 201);
});
