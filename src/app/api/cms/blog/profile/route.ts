import { z } from "zod";
import { ownAuthorProfileSchema } from "@/lib/validation/blog";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { getOwnAuthor, updateOwnAuthor } from "@/server/blog/service";

/** GET /api/cms/blog/profile: o perfil de autor da própria conta (nulo antes do primeiro artigo). */
export const GET = authedRoute({ permission: "blog.view" }, async ({ user }) => json({ author: await getOwnAuthor(user) }));

/** PUT /api/cms/blog/profile { version, data }: foto, bio, cargo e links. Afiliação e endereço só a gestão de autores muda. */
export const PUT = authedRoute({ permission: "blog.create" }, async ({ request, user, ip, userAgent }) => {
  const { version, data } = await readJson(request, z.object({ version: z.number().int().min(1).nullable(), data: ownAuthorProfileSchema }), 16 * 1024);
  const author = await updateOwnAuthor(user, data, version, { ip, userAgent });
  return json({ author });
});
