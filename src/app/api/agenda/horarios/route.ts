import { json, publicRoute } from "@/server/http/handler";
import { POLICIES } from "@/server/security/rate-limit";
import { publicSlots } from "@/server/calendar/availability";
import { CalendarNotConfiguredError, getConnection, isCalendarConfigured } from "@/server/calendar/google";
import { log } from "@/server/log";

/**
 * GET /api/agenda/horarios: dias com horários livres para a call de diagnóstico (próximas semanas).
 * Sem o Google Calendar conectado, responde { connected: false } e o site oferece o WhatsApp.
 */
export const GET = publicRoute({ rateLimit: { policy: POLICIES.slotsByIp, by: "ip" } }, async () => {
  if (!isCalendarConfigured() || !(await getConnection())) return json({ connected: false, days: [] });
  try {
    return json({ connected: true, days: await publicSlots() });
  } catch (error) {
    if (error instanceof CalendarNotConfiguredError) return json({ connected: false, days: [] });
    log.error("slots.failed", { error });
    return json({ connected: false, days: [] });
  }
});
