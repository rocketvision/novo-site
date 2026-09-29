import { optionalText } from "@/lib/content/schemas";
import { mediaListQuerySchema } from "@/lib/validation/media";
import { can } from "@/server/authz/guard";
import { authedRoute, json } from "@/server/http/handler";
import { unprocessable } from "@/server/http/errors";
import { listMedia, uploadMedia } from "@/server/media/service";
import { readImageUpload } from "@/server/media/upload";
import { POLICIES } from "@/server/security/rate-limit";

/**
 * GET /api/cms/blog/media: imagens para os artigos. Quem não tem acesso à biblioteca (o Colunista)
 * vê só as imagens que ele mesmo enviou.
 */
export const GET = authedRoute({ permission: "blog.view" }, async ({ request, user }) => {
  const parsed = mediaListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) throw unprocessable(parsed.error.issues);
  return json(await listMedia({ ...parsed.data, ...(!can(user, "media.view") && { uploadedBy: user.id }) }));
});

/** POST /api/cms/blog/media (multipart: file, alt?): envio de imagem para um artigo, com o mesmo processamento da biblioteca. */
export const POST = authedRoute(
  { permission: "blog.create", rateLimit: { policy: POLICIES.uploadByUser, by: "user" } },
  async ({ request, user, ip, userAgent }) => {
    const upload = await readImageUpload(request);
    const alt = optionalText(300, "O texto alternativo").safeParse(upload.alt ?? "");
    if (!alt.success) throw unprocessable(alt.error.issues.map((i) => ({ ...i, path: ["alt"] })));
    const result = await uploadMedia({ id: user.id, email: user.email }, { ...upload, alt: alt.data }, { ip, userAgent });
    return json(result, result.duplicate ? 200 : 201);
  },
);
