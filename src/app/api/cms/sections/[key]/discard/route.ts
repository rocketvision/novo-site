import { versionOnlySchema } from "@/lib/validation/sections";
import { discardDraft } from "@/server/content/sections";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { assertSectionPermission } from "@/server/content/access";

/** POST /api/cms/sections/:key/discard: volta o rascunho para a versão publicada. */
export const POST = authedRoute<{ key: string }>({ permission: true }, async ({ request, params, user, ip, userAgent }) => {
  assertSectionPermission(user, params.key, "edit");
  const { version } = await readJson(request, versionOnlySchema, 1024);
  return json(await discardDraft({ id: user.id, email: user.email }, params.key, version, { ip, userAgent }));
});
