import { z } from "zod";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { setRuleStatus } from "@/server/alliance/commissions";

/** POST /api/cms/alliance/rules/:id/status: aprovação comercial ou arquivamento. */
export const POST = authedRoute<{ id: string }>({ permission: "alliance.finance" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Regra não encontrada.");
  const { status } = await readJson(request, z.object({ status: z.enum(["approved", "archived"]) }));
  await setRuleStatus(user, params.id, status, { ip, userAgent });
  return json({ ok: true });
});
