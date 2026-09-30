import { z } from "zod";
import { json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { hubRoute } from "@/server/alliance/hub/handler";
import { acceptContract } from "@/server/alliance/contracts";

/** POST /api/alliance/hub/contracts/:id/accept: aceite do termo pelo Partner Owner (confere o hash do texto lido). */
export const POST = hubRoute<{ id: string }>({ permission: "contracts.accept" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Documento não encontrado.");
  const { termsSha256 } = await readJson(request, z.object({ termsSha256: z.string().regex(/^[0-9a-f]{64}$/), confirm: z.literal(true) }), 1024);
  await acceptContract(user, params.id, termsSha256, { ip, userAgent });
  return json({ ok: true });
});
