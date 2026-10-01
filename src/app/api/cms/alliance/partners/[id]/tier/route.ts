import { tierChangeSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { changeTier } from "@/server/alliance/partners";

/** POST /api/cms/alliance/partners/:id/tier: muda o nível, com motivo (avisa a empresa no Hub e por e-mail). */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.partners" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Parceiro não encontrado.");
  const { tierKey, reason } = await readJson(request, tierChangeSchema);
  await changeTier(user, params.id, tierKey, reason, { ip, userAgent });
  return json({ ok: true });
});
