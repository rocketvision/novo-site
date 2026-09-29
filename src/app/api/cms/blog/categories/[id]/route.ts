import { categoryInputSchema, versioned } from "@/lib/validation/blog";
import { authedRoute, json, noContent, readJson } from "@/server/http/handler";
import { deleteCategory, updateCategory } from "@/server/blog/service";

type Params = { id: string };

/** PUT /api/cms/blog/categories/:id { version, data }. */
export const PUT = authedRoute<Params>({ permission: "blog.categories" }, async ({ request, params, user, ip, userAgent }) => {
  const { version, data } = await readJson(request, versioned(categoryInputSchema), 8 * 1024);
  return json(await updateCategory(user, params.id, data, version, { ip, userAgent }));
});

/** DELETE /api/cms/blog/categories/:id: só sem artigos (409 se houver). */
export const DELETE = authedRoute<Params>({ permission: "blog.categories" }, async ({ params, user, ip, userAgent }) => {
  await deleteCategory(user, params.id, { ip, userAgent });
  return noContent();
});
