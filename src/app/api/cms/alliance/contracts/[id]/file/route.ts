import { eq } from "drizzle-orm";
import { authedRoute } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { getDb, schema } from "@/server/db";
import { fileResponse } from "@/server/alliance/files";

/** GET /api/cms/alliance/contracts/:id/file: documento anexado ao contrato. */
export const GET = authedRoute<{ id: string }>({ permission: "alliance.contracts" }, async ({ params }) => {
  if (!isUuid(params.id)) throw notFound("Contrato não encontrado.");
  const [row] = await getDb().select({ fileId: schema.partnerContracts.fileId }).from(schema.partnerContracts).where(eq(schema.partnerContracts.id, params.id));
  if (!row?.fileId) throw notFound("Documento não encontrado.");
  return fileResponse(row.fileId);
});
