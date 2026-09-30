import { eq } from "drizzle-orm";
import { authedRoute } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { getDb, schema } from "@/server/db";
import { fileResponse } from "@/server/alliance/files";

/** GET /api/cms/alliance/resources/:id/file: download do material pela equipe (arquivo privado). */
export const GET = authedRoute<{ id: string }>({ permission: "alliance.resources" }, async ({ params }) => {
  if (!isUuid(params.id)) throw notFound("Material não encontrado.");
  const [row] = await getDb().select({ fileId: schema.partnerResources.fileId }).from(schema.partnerResources).where(eq(schema.partnerResources.id, params.id));
  if (!row?.fileId) throw notFound("Material não encontrado.");
  return fileResponse(row.fileId);
});
