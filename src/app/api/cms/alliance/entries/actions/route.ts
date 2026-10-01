import { entryActionSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { actOnEntries } from "@/server/alliance/commissions";

/** POST /api/cms/alliance/entries/actions: aprova ou cancela lançamentos (em lote). */
export const POST = authedRoute({ permission: "alliance.finance" }, async ({ request, user, ip, userAgent }) => {
  const { ids, action, reason } = await readJson(request, entryActionSchema);
  await actOnEntries(user, ids, action, reason, { ip, userAgent });
  return json({ ok: true });
});
