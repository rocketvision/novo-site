import { tierUpdateSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { updateTier } from "@/server/alliance/settings";

export const PUT = authedRoute<{ key: string }>({ permission: "alliance.settings" }, async ({ params, request, user, ip, userAgent }) => {
  await updateTier(user, params.key, await readJson(request, tierUpdateSchema), { ip, userAgent });
  return json({ ok: true });
});
