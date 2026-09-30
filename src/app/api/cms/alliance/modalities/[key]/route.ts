import { modalityUpdateSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { updateModality } from "@/server/alliance/settings";

export const PUT = authedRoute<{ key: string }>({ permission: "alliance.settings" }, async ({ params, request, user, ip, userAgent }) => {
  await updateModality(user, params.key, await readJson(request, modalityUpdateSchema), { ip, userAgent });
  return json({ ok: true });
});
