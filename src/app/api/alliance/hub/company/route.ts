import { partnerContactSchema } from "@/lib/alliance/validation";
import { json, readJson } from "@/server/http/handler";
import { hubRoute } from "@/server/alliance/hub/handler";
import { updateCompanyContact } from "@/server/alliance/company";

/** PATCH /api/alliance/hub/company: contato principal (interno, não aparece no site; sem aprovação). */
export const PATCH = hubRoute({ permission: "company.edit" }, async ({ request, user, ip, userAgent }) => {
  await updateCompanyContact(user, await readJson(request, partnerContactSchema, 2 * 1024), { ip, userAgent });
  return json({ ok: true });
});
