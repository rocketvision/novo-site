import { payoutInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { createPayout } from "@/server/alliance/commissions";

/** POST /api/cms/alliance/payouts: registra um pagamento com os lançamentos aprovados escolhidos. Idempotente. */
export const POST = authedRoute({ permission: "alliance.finance" }, async ({ request, user, ip, userAgent }) => {
  const result = await createPayout(user, await readJson(request, payoutInputSchema, 64 * 1024), { ip, userAgent });
  return json(result, result.duplicate ? 200 : 201);
});
