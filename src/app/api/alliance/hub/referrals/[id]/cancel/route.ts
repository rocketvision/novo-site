import { referralNoteSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { hubRoute } from "@/server/alliance/hub/handler";
import { cancelReferralByPartner } from "@/server/alliance/referrals";

/** POST /api/alliance/hub/referrals/:id/cancel: o parceiro cancela a própria indicação (antes da qualificação). */
export const POST = hubRoute<{ id: string }>({}, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Indicação não encontrada.");
  const { note } = await readJson(request, referralNoteSchema, 4 * 1024);
  await cancelReferralByPartner(user, params.id, note, { ip, userAgent });
  return json({ ok: true });
});
