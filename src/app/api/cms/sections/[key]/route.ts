import { saveSectionSchema } from "@/lib/validation/sections";
import { getSectionState, saveDraft } from "@/server/content/sections";
import { assertSectionPermission } from "@/server/content/access";
import { authedRoute, json, readJson } from "@/server/http/handler";

type Params = { key: string };

/** GET /api/cms/sections/:key: rascunho, versão publicada e versão atual. */
export const GET = authedRoute<Params>({ permission: true }, async ({ params, user }) => {
  assertSectionPermission(user, params.key, "view");
  return json({ section: await getSectionState(params.key) });
});

/** PUT /api/cms/sections/:key: salva o rascunho. 409 se a versão mudou, 422 se o conteúdo for inválido. */
export const PUT = authedRoute<Params>({ permission: true }, async ({ request, params, user, ip, userAgent }) => {
  assertSectionPermission(user, params.key, "edit");
  const body = await readJson(request, saveSectionSchema, 128 * 1024);
  const result = await saveDraft({ id: user.id, email: user.email }, params.key, body.content, body.version, { ip, userAgent });
  return json(result);
});
