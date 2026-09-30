import { contractInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { saveContract } from "@/server/alliance/contracts";

/** PUT /api/cms/alliance/contracts/:id: edita um rascunho. */
export const PUT = authedRoute<{ id: string }>({ permission: "alliance.contracts" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Contrato não encontrado.");
  return json(await saveContract(user, params.id, await readJson(request, contractInputSchema, 128 * 1024), { ip, userAgent }));
});
