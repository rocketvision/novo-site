import { cmsReferralInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { createReferralFromCms } from "@/server/alliance/referrals";

/** POST /api/cms/alliance/referrals: a equipe registra uma indicação em nome de uma empresa parceira. */
export const POST = authedRoute({ permission: "alliance.referrals" }, async ({ request, user, ip, userAgent }) => {
  const { partnerId, ...input } = await readJson(request, cmsReferralInputSchema, 16 * 1024);
  return json(await createReferralFromCms(user, partnerId, input, { ip, userAgent }), 201);
});
