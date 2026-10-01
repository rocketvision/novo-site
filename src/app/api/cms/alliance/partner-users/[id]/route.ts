import { z } from "zod";
import { eq } from "drizzle-orm";
import { partnerMemberUpdateSchema } from "@/lib/alliance/validation";
import { authedRoute, json, readJson } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { isUuid } from "@/server/media/service";
import { getDb, schema } from "@/server/db";
import { updatePartnerUser } from "@/server/alliance/team";

/** PATCH /api/cms/alliance/partner-users/:id: papel (inclusive Responsável) e acesso de uma pessoa do Hub. */
export const PATCH = authedRoute<{ id: string }>({ permission: "alliance.partners" }, async ({ params, request, user, ip, userAgent }) => {
  if (!isUuid(params.id)) throw notFound("Pessoa não encontrada.");
  const input = await readJson(request, partnerMemberUpdateSchema.extend({ role: z.enum(["owner", "manager", "member"]).optional() }));
  const [target] = await getDb().select({ partnerId: schema.partnerUsers.partnerId }).from(schema.partnerUsers).where(eq(schema.partnerUsers.id, params.id));
  if (!target) throw notFound("Pessoa não encontrada.");
  await updatePartnerUser({ kind: "cms", actor: user }, target.partnerId, params.id, input, { ip, userAgent });
  return json({ ok: true });
});
