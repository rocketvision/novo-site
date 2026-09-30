import { resourceInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { deleteResource, saveResource } from "@/server/alliance/library";

export const PUT = authedRoute<{ id: string }>({ permission: "alliance.resources" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Material não encontrado.");
  return json(await saveResource(user, params.id, await readJson(request, resourceInputSchema, 32 * 1024), { ip, userAgent }));
});

export const DELETE = authedRoute<{ id: string }>({ permission: "alliance.resources" }, async ({ params, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Material não encontrado.");
  await deleteResource(user, params.id, { ip, userAgent });
  return json({ ok: true });
});
