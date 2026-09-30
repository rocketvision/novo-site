import { interestDecisionSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { decideInterest } from "@/server/alliance/library";

/** POST /api/cms/alliance/interests/:id: aceita ou recusa o interesse de um parceiro numa oportunidade. */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.resources" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Interesse não encontrado.");
  const { status } = await readJson(request, interestDecisionSchema);
  await decideInterest(user, params.id, status, { ip, userAgent });
  return json({ ok: true });
});
