import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { hubRoute } from "@/server/alliance/hub/handler";
import { hubContractFile } from "@/server/alliance/contracts";
import { fileResponse } from "@/server/alliance/files";
import { POLICIES } from "@/server/security/rate-limit";

/** GET /api/alliance/hub/contracts/:id/file: documento do contrato, só da própria empresa. */
export const GET = hubRoute<{ id: string }>({ permission: "contracts.view", rateLimit: POLICIES.downloadByUser }, async ({ params, user }) => {
  if (!isUuid(params.id)) throw notFound("Documento não encontrado.");
  return fileResponse(await hubContractFile(user, params.id));
});
