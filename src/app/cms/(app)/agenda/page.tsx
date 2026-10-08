import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarCheck2, CheckCircle2, Video } from "lucide-react";
import { buttonClass } from "@/components/cms/ui/button";
import { EmptyState, PageHeader, Panel } from "@/components/cms/ui/layout";
import { AgendaBoard } from "@/components/cms/agenda/agenda-board";
import { CancelBookingButton, DisconnectGoogleButton, RedirectUriHint } from "@/components/cms/agenda/agenda-actions";
import { headers } from "next/headers";
import { addDays, formatDay, HORIZON_DAYS, localDate, localTime, weekdayOf } from "@/lib/booking";
import { maskPhone } from "@/lib/diagnostic";
import { requirePermission } from "@/server/authz/guard";
import { slotGrid } from "@/server/calendar/availability";
import { upcomingBookings } from "@/server/calendar/bookings";
import { getConnection, isCalendarConfigured, publicOrigin, redirectUri, SUGGESTED_ACCOUNT } from "@/server/calendar/google";
import { formatDateTime } from "@/lib/cms/format";

export const metadata: Metadata = { title: "Agenda" };

type Search = Promise<Record<string, string | string[] | undefined>>;
const WEEKS = Math.ceil(HORIZON_DAYS / 7) + 1;

const NOTICES: Record<string, { tone: "ok" | "error"; text: string }> = {
  conectado: { tone: "ok", text: "Google Calendar conectado. O site já oferece os horários livres." },
  cancelado: { tone: "error", text: "A conexão foi cancelada no Google." },
  erro: { tone: "error", text: "Não foi possível conectar o Google Calendar. Confira a URI de redirecionamento abaixo e tente de novo." },
};

/**
 * Agenda das calls de diagnóstico: a conexão com o Google Calendar, as próximas calls (com Meet) e a
 * grade de disponibilidade, onde a equipe bloqueia horários ou dias inteiros.
 */
export default async function AgendaPage({ searchParams }: { searchParams: Search }) {
  const user = await requirePermission("diagnostics.view", "/cms/agenda");
  const sp = await searchParams;
  const week = Math.min(WEEKS - 1, Math.max(0, Number(typeof sp.semana === "string" ? sp.semana : 0) || 0));
  const notice = typeof sp.google === "string" ? NOTICES[sp.google] : undefined;

  // Segunda-feira da semana pedida (0 = a semana atual).
  const today = localDate(new Date());
  const monday = addDays(today, -((weekdayOf(today) + 6) % 7) + week * 7);
  const [connection, bookings, grid] = await Promise.all([getConnection(), upcomingBookings(), slotGrid({ first: monday, last: addDays(monday, 4), requireGoogle: false })]);
  const configured = isCalendarConfigured();
  const callback = redirectUri(publicOrigin(await headers(), "http://localhost:3000"));
  const canManage = user.permissions.has("diagnostics.manage");
  const canConnect = user.permissions.has("settings.edit");

  const days = grid.map((d) => ({
    date: d.date,
    holiday: d.holiday,
    slots: d.slots,
    dayBlockId: d.blocks.find((b) => b.endsAt.getTime() - b.startsAt.getTime() >= 24 * 3600_000 - 1)?.id,
  }));

  return (
    <div>
      <PageHeader title="Agenda" description="As calls de diagnóstico marcadas pelo site. Horários de 30 minutos, de segunda a sexta, das 9h às 11h e das 13h30 às 17h30." />

      {notice && (
        <p className={notice.tone === "ok" ? "mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800" : "mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"} role="status">
          {notice.text}
        </p>
      )}

      {/* Conexão com o Google Calendar */}
      <section className="mb-6 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {connection ? <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-5 text-amber-500" />}
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900">{connection ? `Google Calendar conectado: ${connection.email}` : "Google Calendar não conectado"}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {connection
                ? `Desde ${formatDateTime(connection.connectedAt)}. Compromissos da agenda ficam indisponíveis no site, e cada call vira um evento com Google Meet.`
                : configured
                  ? `Conecte a agenda que recebe as calls, entrando com ${SUGGESTED_ACCOUNT} (o Google mostra o seletor de contas). Enquanto isso, o site oferece só o WhatsApp no fim do diagnóstico.`
                  : "Falta configurar GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET na Vercel (credencial OAuth do Google Cloud)."}
            </p>
            {configured && !connection && canConnect && <RedirectUriHint uri={callback} />}
          </div>
        </div>
        {canConnect && configured && (
          <div className="flex shrink-0 gap-2">
            {connection && <DisconnectGoogleButton email={connection.email} />}
            {/* Link comum: o consentimento do Google é uma navegação, não um fetch. */}
            <a href="/api/cms/google/connect" className={buttonClass(connection ? "ghost" : "primary", "sm")}>
              {connection ? "Reconectar" : "Conectar Google Calendar"}
            </a>
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_20rem]">
        <Panel title="Disponibilidade">
          <AgendaBoard days={days} week={week} weeks={WEEKS} canManage={canManage} />
        </Panel>

        <Panel title="Próximas calls">
          {bookings.length === 0 ? (
            <EmptyState icon={<CalendarCheck2 className="size-7" />} title="Nenhuma call marcada ainda." />
          ) : (
            <ul className="-my-2 divide-y divide-zinc-100">
              {bookings.map((b) => (
                <li key={b.id} className="py-3">
                  <p className="text-xs font-medium text-sky-700 first-letter:uppercase">
                    {formatDay(localDate(b.startsAt))} · {localTime(b.startsAt)}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-zinc-900">{b.business}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {b.name} · {maskPhone(b.whatsapp)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {b.meetUrl && (
                      <a href={b.meetUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                        <Video className="size-3.5" /> Meet
                      </a>
                    )}
                    {b.diagnosticId && (
                      <Link href={`/cms/diagnosticos/${b.diagnosticId}`} className={buttonClass("ghost", "sm")}>
                        Diagnóstico
                      </Link>
                    )}
                    {canManage && <CancelBookingButton id={b.id} who={b.name} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
