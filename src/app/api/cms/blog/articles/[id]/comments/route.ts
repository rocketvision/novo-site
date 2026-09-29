import { commentSchema } from "@/lib/validation/blog";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { addComment } from "@/server/blog/service";

/** POST /api/cms/blog/articles/:id/comments { body }: comentário editorial (quem revisa ou o próprio autor). */
export const POST = authedRoute<{ id: string }>({ permission: "blog.view" }, async ({ request, params, user, ip, userAgent }) => {
  const { body } = await readJson(request, commentSchema, 8 * 1024);
  return json(await addComment(user, params.id, body, { ip, userAgent }), 201);
});
