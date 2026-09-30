import { z } from "zod";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { setFeatured } from "@/server/alliance/partners";

/** POST /api/cms/alliance/partners/:id/featured: destaque no diretório (vale na hora). */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.publish" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Parceiro não encontrado.");
  const { featured } = await readJson(request, z.object({ featured: z.boolean() }));
  await setFeatured(user, params.id, featured, { ip, userAgent });
  return json({ ok: true });
});
