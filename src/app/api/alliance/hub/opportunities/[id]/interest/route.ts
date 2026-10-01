import { interestSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { hubRoute } from "@/server/alliance/hub/handler";
import { expressInterest } from "@/server/alliance/library";

/** POST /api/alliance/hub/opportunities/:id/interest: a empresa manifesta interesse (uma vez). */
export const POST = hubRoute<{ id: string }>({ permission: "opportunities.interest" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Oportunidade não encontrada.");
  const { message } = await readJson(request, interestSchema, 4 * 1024);
  await expressInterest(user, params.id, message, { ip, userAgent });
  return json({ ok: true }, 201);
});
