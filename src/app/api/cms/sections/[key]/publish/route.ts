import { versionOnlySchema } from "@/lib/validation/sections";
import { publishSection } from "@/server/content/sections";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { assertSectionPermission } from "@/server/content/access";

/** POST /api/cms/sections/:key/publish: publica o rascunho salvo. 409 se houver alteração mais nova. */
export const POST = authedRoute<{ key: string }>({ permission: true }, async ({ request, params, user, ip, userAgent }) => {
  assertSectionPermission(user, params.key, "publish");
  const { version } = await readJson(request, versionOnlySchema, 1024);
  return json(await publishSection({ id: user.id, email: user.email }, params.key, version, { ip, userAgent }));
});
