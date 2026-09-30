import { eq } from "drizzle-orm";
import { hubProfileSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { getDb, schema } from "@/server/db";
import { audit } from "@/server/audit";

/** PATCH /api/alliance/hub/account: nome exibido da própria conta. */
export const PATCH = hubRoute({}, async ({ request, user, ip, userAgent }) => {
  const { name } = await readJson(request, hubProfileSchema, 2 * 1024);
  await getDb().update(schema.partnerUsers).set({ name, updatedAt: new Date() }).where(eq(schema.partnerUsers.id, user.id));
  await audit({ actor: { id: null, email: user.email }, action: "alliance.hub.profile_updated", resourceType: "partner_user", resourceId: user.id, summary: "Alliance Hub: atualizou o nome", changes: { name: { before: user.name, after: name } }, ip, userAgent });
  return json({ ok: true });
});
