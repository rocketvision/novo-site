import { adjustmentInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { createAdjustment } from "@/server/alliance/commissions";

/** POST /api/cms/alliance/adjustments: ajuste manual (positivo ou negativo), sempre com motivo. */
export const POST = authedRoute({ permission: "alliance.finance" }, async ({ request, user, ip, userAgent }) => {
  return json(await createAdjustment(user, await readJson(request, adjustmentInputSchema), { ip, userAgent }), 201);
});
