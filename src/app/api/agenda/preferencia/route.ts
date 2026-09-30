import { preferenceSchema } from "@/lib/booking";
import { json, publicRoute, readJson } from "@/server/http/handler";
import { POLICIES } from "@/server/security/rate-limit";
import { setContactPreference } from "@/server/calendar/bookings";

/** POST /api/agenda/preferencia: "vou chamar no WhatsApp" ou "aguardo vocês me chamarem". */
export const POST = publicRoute({ rateLimit: { policy: POLICIES.bookingByIp, by: "ip" } }, async ({ request }) => {
  const input = await readJson(request, preferenceSchema);
  await setContactPreference(input.diagnosticId, input.token, input.preference);
  return json({ ok: true });
});
