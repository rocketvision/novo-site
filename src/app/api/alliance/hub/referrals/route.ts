import { referralInputSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { createReferral } from "@/server/alliance/referrals";

/** POST /api/alliance/hub/referrals: registra uma indicação (duplicidade conferida no servidor). */
export const POST = hubRoute({ permission: "referrals.create" }, async ({ request, user, ip, userAgent }) => {
  return json(await createReferral(user, await readJson(request, referralInputSchema, 16 * 1024), { ip, userAgent }), 201);
});
