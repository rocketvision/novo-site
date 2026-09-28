import { z } from "zod";
import { authedRoute, json } from "@/server/http/handler";
import { forbidden, unprocessable } from "@/server/http/errors";
import { replaceMedia } from "@/server/media/service";
import { readImageUpload } from "@/server/media/upload";
import { POLICIES } from "@/server/security/rate-limit";

/**
 * POST /api/cms/media/:id/replace (multipart: file, expectedUpdatedAt): troca o arquivo mantendo o id.
 * Exige editar e enviar mídia. 409 se a imagem mudou desde que a tela foi aberta.
 */
export const POST = authedRoute<{ id: string }>(
  { permission: "media.edit", rateLimit: { policy: POLICIES.uploadByUser, by: "user" } },
  async ({ request, params, user, ip, userAgent }) => {
    if (!user.permissions.has("media.upload")) throw forbidden();
    const upload = await readImageUpload(request);
    const expected = z.string().datetime().safeParse(upload.expectedUpdatedAt);
    if (!expected.success) throw unprocessable([{ path: ["expectedUpdatedAt"], message: "Versão ausente. Recarregue a página." }]);

    const media = await replaceMedia({ id: user.id, email: user.email }, params.id, upload, expected.data, { ip, userAgent });
    return json({ media });
  },
);
