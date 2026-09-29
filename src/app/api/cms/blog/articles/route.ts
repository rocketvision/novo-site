import { articleListQuerySchema, createArticleSchema } from "@/lib/validation/blog";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { unprocessable } from "@/server/http/errors";
import { createArticle, listArticles } from "@/server/blog/service";

/** GET /api/cms/blog/articles?q=&status=&categoria=&autor=&aba=: lista do Studio. Quem só escreve vê só os próprios. */
export const GET = authedRoute({ permission: "blog.view" }, async ({ request, user }) => {
  const parsed = articleListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) throw unprocessable(parsed.error.issues);
  return json({ articles: await listArticles(user, parsed.data) });
});

/** POST /api/cms/blog/articles: cria como rascunho. 201, 403 autoria ou imagem de outra pessoa, 409 endereço em uso, 422 dados inválidos. */
export const POST = authedRoute({ permission: "blog.create" }, async ({ request, user, ip, userAgent }) => {
  const { data } = await readJson(request, createArticleSchema, 512 * 1024);
  return json(await createArticle(user, data, { ip, userAgent }), 201);
});
