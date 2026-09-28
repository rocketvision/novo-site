import { z } from "zod";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { setFeatured } from "@/server/projects/service";

const schema = z.object({ featured: z.boolean() });

/** POST /api/cms/projects/:id/feature: liga ou desliga o destaque. Vale na hora para projetos publicados. */
export const POST = authedRoute<{ id: string }>({ permission: "projects.edit" }, async ({ request, params, user, ip, userAgent }) => {
  const { featured } = await readJson(request, schema, 256);
  return json(await setFeatured({ id: user.id, email: user.email }, params.id, featured, { ip, userAgent }));
});
