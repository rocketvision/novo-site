import { restoreRevisionSchema } from "@/lib/validation/blog";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { getRevision, restoreRevision } from "@/server/blog/service";

type Params = { id: string; revisionId: string };

/** GET /api/cms/blog/articles/:id/revisions/:revisionId: conteúdo de uma revisão, para comparar antes de restaurar. */
export const GET = authedRoute<Params>({ permission: "blog.view" }, async ({ params, user }) => {
  const rev = await getRevision(user, params.id, params.revisionId);
  return json({ id: rev.id, number: rev.number, reason: rev.reason, createdAt: rev.createdAt, snapshot: rev.snapshot });
});

/** POST /api/cms/blog/articles/:id/revisions/:revisionId { version }: restaura como uma nova revisão (o histórico continua). */
export const POST = authedRoute<Params>({ permission: "blog.view" }, async ({ request, params, user, ip, userAgent }) => {
  const { version } = await readJson(request, restoreRevisionSchema, 256);
  return json(await restoreRevision(user, params.id, params.revisionId, version, { ip, userAgent }));
});
