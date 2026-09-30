import { z } from "zod";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { publishPartner } from "@/server/alliance/partners";

/** POST /api/cms/alliance/partners/:id/publish: congela perfil e página e coloca no diretório. */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.publish" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Parceiro não encontrado.");
  const { version } = await readJson(request, z.object({ version: z.number().int().positive() }));
  return json(await publishPartner(user, params.id, version, { ip, userAgent }));
});
