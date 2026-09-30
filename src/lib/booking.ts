import { z } from "zod";

/**
 * Agendamento da call de diagnóstico: regras de horário compartilhadas entre o site (seletor de
 * horários), a API e o CMS (grade de disponibilidade).
 *
 * Horário de Brasília. São Paulo não tem horário de verão desde 2019, então o fuso é fixo em -03:00;
 * se voltar a ter, basta trocar OFFSET por um cálculo por data.
 */

export const TIME_ZONE = "America/Sao_Paulo";
export const OFFSET = "-03:00";
/** Janelas de atendimento (início e fim, hora local). */
export const WINDOWS: [string, string][] = [
  ["09:00", "11:00"],
  ["13:30", "17:30"],
];
export const SLOT_MINUTES = 30;
/** Dias da semana com atendimento (0 = domingo). */
export const WEEKDAYS = [1, 2, 3, 4, 5];
/** Até quantos dias à frente dá pra agendar. */
export const HORIZON_DAYS = 21;
/** Antecedência mínima para marcar (em minutos). */
export const MIN_NOTICE_MINUTES = 120;

const pad = (n: number) => String(n).padStart(2, "0");
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const toHHMM = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** Horários de início de cada dia de atendimento: 09:00, 09:30, … 17:00. */
export const SLOT_TIMES: string[] = WINDOWS.flatMap(([from, to]) => {
  const out: string[] = [];
  for (let m = toMinutes(from); m + SLOT_MINUTES <= toMinutes(to); m += SLOT_MINUTES) out.push(toHHMM(m));
  return out;
});

/** Instante (Date) de uma data local "2026-10-05" e hora "09:30". */
export const slotStart = (date: string, time: string) => new Date(`${date}T${time}:00${OFFSET}`);
export const slotEnd = (start: Date) => new Date(start.getTime() + SLOT_MINUTES * 60_000);

/** Data local (AAAA-MM-DD) de um instante, no fuso de São Paulo. */
export function localDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
/** Hora local (HH:MM) de um instante. */
export function localTime(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}
/** Dia da semana local (0 = domingo) de uma data AAAA-MM-DD. */
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00${OFFSET}`).getUTCDay();
/** Soma dias a uma data AAAA-MM-DD. */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "segunda, 6 de outubro" / "seg." e "6" para o seletor. */
export function formatDay(date: string, style: "long" | "weekday" | "day" | "month" = "long") {
  const d = new Date(`${date}T12:00:00${OFFSET}`);
  const opts: Intl.DateTimeFormatOptions =
    style === "long"
      ? { weekday: "long", day: "numeric", month: "long" }
      : style === "weekday"
        ? { weekday: "short" }
        : style === "day"
          ? { day: "numeric" }
          : { month: "short" };
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, ...opts }).format(d).replace(".", "");
}

/** Estado de cada horário na grade (o site só vê livre ou não; o CMS vê o motivo). */
export type SlotState = "free" | "busy" | "blocked" | "booked" | "past" | "holiday";
export type DaySlots = { date: string; holiday?: string; slots: { time: string; start: string; state: SlotState; label?: string }[] };

export const bookingRequestSchema = z.object({
  diagnosticId: z.string().uuid(),
  token: z.string().min(20).max(200),
  start: z.string().datetime({ offset: true }),
  email: z.union([z.literal(""), z.string().trim().email().max(160)]).optional(),
});

export const preferenceSchema = z.object({
  diagnosticId: z.string().uuid(),
  token: z.string().min(20).max(200),
  preference: z.enum(["whatsapp", "aguardar"]),
});

export const blockSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Sem horários: o dia inteiro. */
    from: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    to: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    reason: z.string().trim().max(120).optional(),
  })
  .refine((v) => (v.from === undefined) === (v.to === undefined), "intervalo")
  .refine((v) => !v.from || !v.to || v.from < v.to, "intervalo");

/** Link "adicionar ao Google Agenda" para o cliente, com o Meet na descrição. */
export function googleCalendarLink({ start, end, title, details }: { start: Date; end: Date; title: string; details: string }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${fmt(start)}/${fmt(end)}`, details, ctz: TIME_ZONE });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export const CONTACT_PREFERENCES: Record<string, string> = {
  agendou: "Agendou a call",
  whatsapp: "Vai chamar no WhatsApp",
  aguardar: "Aguarda a Rocket chamar",
};
