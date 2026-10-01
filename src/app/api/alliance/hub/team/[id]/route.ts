import { partnerMemberUpdateSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { hubRoute } from "@/server/alliance/hub/handler";
import { updatePartnerUser } from "@/server/alliance/team";

/** PATCH /api/alliance/hub/team/:id: papel e acesso de alguém da própria empresa (só o Partner Owner). */
export const PATCH = hubRoute<{ id: string }>({ permission: "team.manage" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Pessoa não encontrada.");
  await updatePartnerUser({ kind: "hub", user }, user.partner.id, params.id, await readJson(request, partnerMemberUpdateSchema, 1024), { ip, userAgent });
  return json({ ok: true });
});
