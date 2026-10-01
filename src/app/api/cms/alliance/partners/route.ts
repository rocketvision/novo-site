import { z } from "zod";
import { partnerInputSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { createPartner } from "@/server/alliance/partners";

/** POST /api/cms/alliance/partners: cadastro manual (sem candidatura). Começa sem publicação e sem acesso ao Hub. */
export const POST = authedRoute({ permission: "alliance.partners" }, async ({ request, user, ip, userAgent }) => {
  const { data } = await readJson(request, z.object({ data: partnerInputSchema }), 128 * 1024);
  const created = await createPartner(user, data, { ip, userAgent });
  return json(created, 201);
});
