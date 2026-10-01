import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { hubRoute } from "@/server/alliance/hub/handler";
import { hubResourceFile } from "@/server/alliance/library";
import { fileResponse } from "@/server/alliance/files";
import { POLICIES } from "@/server/security/rate-limit";

/** GET /api/alliance/hub/resources/:id/file: baixa um material, se a empresa for elegível. */
export const GET = hubRoute<{ id: string }>({ rateLimit: POLICIES.downloadByUser }, async ({ params, user }) => {
  if (!isUuid(params.id)) throw notFound("Material não encontrado.");
  return fileResponse(await hubResourceFile(user, params.id));
});
