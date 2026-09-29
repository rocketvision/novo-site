import { articleActionSchema } from "@/lib/validation/blog";
import type { BlogAction } from "@/lib/blog/workflow";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { transitionArticle } from "@/server/blog/service";

/**
 * POST /api/cms/blog/articles/:id/actions { action, version, comment?, scheduledAt? }
 * Enviar, devolver, aprovar, publicar, agendar, despublicar, arquivar e restaurar.
 * A permissão de cada ação vem da tabela do fluxo (403); ação fora de ordem ou versão antiga, 409.
 */
export const POST = authedRoute<{ id: string }>({ permission: "blog.view" }, async ({ request, params, user, ip, userAgent }) => {
  const body = await readJson(request, articleActionSchema, 8 * 1024);
  return json(await transitionArticle(user, params.id, body.action as BlogAction, body, { ip, userAgent }));
});
