import { referralNoteSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { hubRoute } from "@/server/alliance/hub/handler";
import { addPartnerNote } from "@/server/alliance/referrals";

/** POST /api/alliance/hub/referrals/:id/notes: mensagem do parceiro no histórico da indicação. */
export const POST = hubRoute<{ id: string }>({}, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Indicação não encontrada.");
  const { note } = await readJson(request, referralNoteSchema, 4 * 1024);
  await addPartnerNote(user, params.id, note, { ip, userAgent });
  return json({ ok: true });
});
