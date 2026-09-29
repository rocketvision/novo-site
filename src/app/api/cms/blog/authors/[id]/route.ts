import { authorInputSchema, versioned } from "@/lib/validation/blog";
import { authedRoute, json, noContent, readJson } from "@/server/http/handler";
import { deleteAuthor, updateAuthor } from "@/server/blog/service";

type Params = { id: string };

/** PUT /api/cms/blog/authors/:id { version, data }. */
export const PUT = authedRoute<Params>({ permission: "blog.authors" }, async ({ request, params, user, ip, userAgent }) => {
  const { version, data } = await readJson(request, versioned(authorInputSchema), 16 * 1024);
  return json(await updateAuthor(user, params.id, data, version, { ip, userAgent }));
});

/** DELETE /api/cms/blog/authors/:id: só sem artigos (409 se houver). */
export const DELETE = authedRoute<Params>({ permission: "blog.authors" }, async ({ params, user, ip, userAgent }) => {
  await deleteAuthor(user, params.id, { ip, userAgent });
  return noContent();
});
