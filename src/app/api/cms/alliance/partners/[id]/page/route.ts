import { z } from "zod";
import { partnerPageSchema } from "@/lib/alliance/page-blocks";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { savePartnerPage } from "@/server/alliance/partners";

/** PUT /api/cms/alliance/partners/:id/page: salva os blocos da página exclusiva. */
export const PUT = authedRoute<{ id: string }>({ permission: "alliance.publish" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Parceiro não encontrado.");
  const { content, version } = await readJson(request, z.object({ content: partnerPageSchema, version: z.number().int().positive() }), 128 * 1024);
  return json(await savePartnerPage(user, params.id, content, version, { ip, userAgent }));
});
