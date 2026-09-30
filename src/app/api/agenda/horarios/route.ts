import { json, publicRoute } from "@/server/http/handler";
import { enforce, POLICIES } from "@/server/security/rate-limit";
import { publicSlots } from "@/server/calendar/availability";
import { CalendarNotConfiguredError, getConnection, isCalendarConfigured } from "@/server/calendar/google";
import { log } from "@/server/log";

/**
 * GET /api/agenda/horarios?mes=AAAA-MM: dias com horários livres de um mês para a call de diagnóstico
 * (dentro da janela de agendamento; sem `mes`, o mês atual).
 * Sem o Google Calendar conectado, responde { connected: false } e o site oferece o WhatsApp.
 */
export const GET = publicRoute({ rateLimit: { policy: POLICIES.slotsByIp, by: "ip" } }, async ({ request }) => {
  // Teto geral: protege a cota do Google Calendar mesmo com muitos IPs diferentes.
  await enforce(POLICIES.slotsGlobal, "all");
  const mes = new URL(request.url).searchParams.get("mes");
  const month = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : undefined;
  if (!isCalendarConfigured() || !(await getConnection())) return json({ connected: false, days: [] });
  try {
    return json({ connected: true, ...(await publicSlots(month)) });
  } catch (error) {
    if (error instanceof CalendarNotConfiguredError) return json({ connected: false, days: [] });
    log.error("slots.failed", { error });
    return json({ connected: false, days: [] });
  }
});
