import { bookingRequestSchema, googleCalendarLink } from "@/lib/booking";
import { json, publicRoute, readJson } from "@/server/http/handler";
import { HttpError } from "@/server/http/errors";
import { enforce, POLICIES } from "@/server/security/rate-limit";
import { bookCall } from "@/server/calendar/bookings";
import { CalendarNotConfiguredError } from "@/server/calendar/google";

/**
 * POST /api/agenda: agenda a call de um diagnóstico num horário livre. Cria o evento com Google Meet
 * na agenda da Rocket e devolve o link do Meet e o link para a pessoa salvar na agenda dela.
 * 409 quando o horário acabou de ser ocupado; 503 sem o Google Calendar conectado.
 *
 * Proteções: mesma origem (CSRF), JSON de até 4 KB, token do diagnóstico (só quem o enviou agenda,
 * comparado em tempo constante e válido por 7 dias), uma call por diagnóstico, limites por IP, por
 * diagnóstico e diário geral, e o horário é conferido de novo no Google antes de criar o evento.
 */
export const POST = publicRoute({ rateLimit: { policy: POLICIES.bookingByIp, by: "ip" } }, async ({ request }) => {
  const input = await readJson(request, bookingRequestSchema, 4 * 1024);
  // Tentativas por diagnóstico e teto diário geral: cada call cria evento e pode mandar convite.
  await enforce(POLICIES.bookingByDiagnostic, input.diagnosticId);
  await enforce(POLICIES.bookingGlobal, "all");
  try {
    const booking = await bookCall({ diagnosticId: input.diagnosticId, token: input.token, start: new Date(input.start), email: input.email || undefined });
    const details = [`Call de diagnóstico com a Rocket Vision (15 a 30 minutos).`, booking.meetUrl ? `Google Meet: ${booking.meetUrl}` : ""].filter(Boolean).join("\n");
    return json({
      start: booking.startsAt,
      end: booking.endsAt,
      meetUrl: booking.meetUrl,
      calendarUrl: googleCalendarLink({ start: booking.startsAt, end: booking.endsAt, title: "Call de diagnóstico · Rocket Vision", details }),
    });
  } catch (error) {
    if (error instanceof CalendarNotConfiguredError) throw new HttpError(503, "calendar_unavailable", "A agenda não está disponível agora. Chame a Rocket no WhatsApp.");
    throw error;
  }
});
