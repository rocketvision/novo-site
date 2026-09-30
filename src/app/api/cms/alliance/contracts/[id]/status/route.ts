import { contractStatusSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { changeContractStatus } from "@/server/alliance/contracts";

/** POST /api/cms/alliance/contracts/:id/status: enviar para aceite, vigente, encerrar, vencer, voltar a rascunho. */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.contracts" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Contrato não encontrado.");
  const { action } = await readJson(request, contractStatusSchema);
  await changeContractStatus(user, params.id, action, { ip, userAgent });
  return json({ ok: true });
});
