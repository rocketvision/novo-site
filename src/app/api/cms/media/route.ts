import { optionalText } from "@/lib/content/schemas";
import { mediaListQuerySchema } from "@/lib/validation/media";
import { authedRoute, json } from "@/server/http/handler";
import { unprocessable } from "@/server/http/errors";
import { listMedia, uploadMedia } from "@/server/media/service";
import { readImageUpload } from "@/server/media/upload";
import { POLICIES } from "@/server/security/rate-limit";

/** GET /api/cms/media?q=&filter=&cursor=: lista paginada da biblioteca. */
export const GET = authedRoute({ permission: "media.view" }, async ({ request }) => {
  const parsed = mediaListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) throw unprocessable(parsed.error.issues);
  return json(await listMedia(parsed.data));
});

/**
 * POST /api/cms/media (multipart: file, alt?): 201 com a mídia criada,
 * 200 se a mesma imagem já existia, 413 grande demais, 415 formato não aceito, 422 imagem inválida.
 */
export const POST = authedRoute(
  { permission: "media.upload", rateLimit: { policy: POLICIES.uploadByUser, by: "user" } },
  async ({ request, user, ip, userAgent }) => {
    const upload = await readImageUpload(request);
    const alt = optionalText(300, "O texto alternativo").safeParse(upload.alt ?? "");
    if (!alt.success) throw unprocessable(alt.error.issues.map((i) => ({ ...i, path: ["alt"] })));

    const result = await uploadMedia({ id: user.id, email: user.email }, { ...upload, alt: alt.data }, { ip, userAgent });
    return json(result, result.duplicate ? 200 : 201);
  },
);
