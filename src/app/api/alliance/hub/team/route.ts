import { partnerInviteSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { invitePartnerUser } from "@/server/alliance/hub/auth";

/** POST /api/alliance/hub/team: convida alguém da própria empresa (papéis permitidos conferidos no servidor). */
export const POST = hubRoute({ permission: "team.manage" }, async ({ request, user, ip, userAgent }) => {
  const input = await readJson(request, partnerInviteSchema, 2 * 1024);
  const result = await invitePartnerUser({ kind: "hub", user }, user.partner.id, input, { ip, userAgent });
  return json({ id: result.id, delivered: result.delivered }, 201);
});
