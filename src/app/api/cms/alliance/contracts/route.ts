import { contractInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { saveContract } from "@/server/alliance/contracts";

/** POST /api/cms/alliance/contracts: novo contrato (nova versão do tipo para o parceiro). */
export const POST = authedRoute({ permission: "alliance.contracts" }, async ({ request, user, ip, userAgent }) => {
  return json(await saveContract(user, null, await readJson(request, contractInputSchema, 128 * 1024), { ip, userAgent }), 201);
});
