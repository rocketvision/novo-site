import { categoryInputSchema } from "@/lib/validation/blog";
import { z } from "zod";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { createCategory, listCategories } from "@/server/blog/service";

/** GET /api/cms/blog/categories: todas, com a contagem de artigos. */
export const GET = authedRoute({ permission: "blog.view" }, async () => json({ categories: await listCategories() }));

/** POST /api/cms/blog/categories { data }: 201, 409 endereço em uso. */
export const POST = authedRoute({ permission: "blog.categories" }, async ({ request, user, ip, userAgent }) => {
  const { data } = await readJson(request, z.object({ data: categoryInputSchema }), 8 * 1024);
  return json(await createCategory(user, data, { ip, userAgent }), 201);
});
