import { mediaUpdateSchema } from "@/lib/validation/media";
import { authedRoute, json, noContent, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { deleteMedia, getMedia, updateMedia } from "@/server/media/service";

type Params = { id: string };

/** GET /api/cms/media/:id: dados da imagem e onde ela é usada. */
export const GET = authedRoute<Params>({ permission: "media.view" }, async ({ params }) => {
  const media = await getMedia(params.id);
  if (!media) throw notFound("Imagem não encontrada.");
  return json({ media });
});

/** PATCH /api/cms/media/:id: texto alternativo e nome. 409 se outra pessoa alterou antes. */
export const PATCH = authedRoute<Params>({ permission: "media.edit" }, async ({ request, params, user, ip, userAgent }) => {
  const input = await readJson(request, mediaUpdateSchema, 8 * 1024);
  const media = await updateMedia({ id: user.id, email: user.email }, params.id, input, { ip, userAgent });
  return json({ media });
});

/** DELETE /api/cms/media/:id: 204, ou 409 com a lista de onde a imagem está em uso. */
export const DELETE = authedRoute<Params>({ permission: "media.delete" }, async ({ params, user, ip, userAgent }) => {
  await deleteMedia({ id: user.id, email: user.email }, params.id, { ip, userAgent });
  return noContent();
});
