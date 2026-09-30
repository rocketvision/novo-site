import { receiptInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { recordReceipt } from "@/server/alliance/commissions";

/**
 * POST /api/cms/alliance/receipts: registra um recebimento (ou reembolso) de uma indicação ganha e
 * gera o lançamento de comissão pela regra vigente. O valor da comissão é sempre calculado aqui.
 */
export const POST = authedRoute({ permission: "alliance.finance" }, async ({ request, user, ip, userAgent }) => {
  const input = await readJson(request, receiptInputSchema);
  return json(await recordReceipt(user, input, { ip, userAgent }), 201);
});
