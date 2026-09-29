import { z } from "zod";
import { authedRoute, noContent, readJson } from "@/server/http/handler";
import { resolveComment } from "@/server/blog/service";

const schema = z.object({ resolved: z.boolean() });

/** PATCH /api/cms/blog/articles/:id/comments/:commentId { resolved }: marca como resolvido ou reabre. */
export const PATCH = authedRoute<{ id: string; commentId: string }>({ permission: "blog.view" }, async ({ request, params, user }) => {
  const { resolved } = await readJson(request, schema, 256);
  await resolveComment(user, params.id, params.commentId, resolved);
  return noContent();
});
