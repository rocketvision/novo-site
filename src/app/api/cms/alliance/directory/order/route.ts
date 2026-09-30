import { directoryOrderSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { reorderDirectory } from "@/server/alliance/partners";

/** POST /api/cms/alliance/directory/order: ordem de exibição no diretório (vale na hora). */
export const POST = authedRoute({ permission: "alliance.publish" }, async ({ request, user, ip, userAgent }) => {
  const { ids } = await readJson(request, directoryOrderSchema);
  await reorderDirectory(user, ids, { ip, userAgent });
  return json({ ok: true });
});
