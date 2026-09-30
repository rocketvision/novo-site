import { z } from "zod";
import { partnerInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { updatePartner } from "@/server/alliance/partners";

/** PUT /api/cms/alliance/partners/:id: salva a cópia de trabalho (o site só muda ao publicar). */
export const PUT = authedRoute<{ id: string }>({ permission: "alliance.partners" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Parceiro não encontrado.");
  const { data, version } = await readJson(request, z.object({ data: partnerInputSchema, version: z.number().int().positive() }), 128 * 1024);
  return json(await updatePartner(user, params.id, data, version, { ip, userAgent }));
});
