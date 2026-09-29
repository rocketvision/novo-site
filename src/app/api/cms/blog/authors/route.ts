import { z } from "zod";
import { authorInputSchema } from "@/lib/validation/blog";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { createAuthor, listAuthors } from "@/server/blog/service";

/** GET /api/cms/blog/authors: perfis de autor (gestão). */
export const GET = authedRoute({ permission: "blog.authors" }, async () => json({ authors: await listAuthors() }));

/** POST /api/cms/blog/authors { data }: 201, 409 endereço ou conta já em uso. */
export const POST = authedRoute({ permission: "blog.authors" }, async ({ request, user, ip, userAgent }) => {
  const { data } = await readJson(request, z.object({ data: authorInputSchema }), 16 * 1024);
  return json(await createAuthor(user, data, { ip, userAgent }), 201);
});
