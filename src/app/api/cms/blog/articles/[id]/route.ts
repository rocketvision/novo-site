import { deleteArticleSchema, updateArticleSchema } from "@/lib/validation/blog";
import { authedRoute, json, noContent, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { deleteArticle, getArticleForEditor, updateArticle } from "@/server/blog/service";

type Params = { id: string };

/** GET /api/cms/blog/articles/:id: cópia de trabalho, versão e ações disponíveis. 404 se não existe ou não é seu. */
export const GET = authedRoute<Params>({ permission: "blog.view" }, async ({ params, user }) => {
  const article = await getArticleForEditor(user, params.id);
  if (!article) throw notFound("Artigo não encontrado.");
  return json({ version: article.row.version, status: article.row.status, data: article.input, actions: article.actions, canEdit: article.canEdit });
});

/** PUT /api/cms/blog/articles/:id: salva a cópia de trabalho. A permissão de editar (própria ou de qualquer autor) é conferida no serviço. */
export const PUT = authedRoute<Params>({ permission: "blog.view" }, async ({ request, params, user, ip, userAgent }) => {
  const { version, data } = await readJson(request, updateArticleSchema, 512 * 1024);
  return json(await updateArticle(user, params.id, data, version, { ip, userAgent }));
});

/** DELETE /api/cms/blog/articles/:id: exclusão definitiva de rascunho ou arquivado, com o endereço digitado. */
export const DELETE = authedRoute<Params>({ permission: "blog.delete" }, async ({ request, params, user, ip, userAgent }) => {
  const { version, confirmSlug } = await readJson(request, deleteArticleSchema, 1024);
  await deleteArticle(user, params.id, version, confirmSlug, { ip, userAgent });
  return noContent();
});
