import "server-only";
import { and, asc, gt, gte, lt, ne } from "drizzle-orm";
import { addDays, HORIZON_DAYS, localDate, localTime, MIN_NOTICE_MINUTES, SLOT_TIMES, slotEnd, slotStart, WEEKDAYS, weekdayOf, type DaySlots, type SlotState } from "@/lib/booking";
import { getDb } from "@/server/db";
import { availabilityBlocks, bookings } from "@/server/db/schema";
import { busyIntervals, CalendarNotConfiguredError, holidays } from "./google";

type Interval = { start: Date; end: Date };
const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/** Primeiro e último dia da janela de agendamento (hoje até HORIZON_DAYS à frente). */
export function bookingRange(now = new Date()) {
  const first = localDate(now);
  const last = addDays(first, HORIZON_DAYS);
  return { first, last, from: slotStart(first, "00:00"), to: slotStart(addDays(last, 1), "00:00") };
}

/**
 * Grade de horários de um período: para cada dia útil, cada horário de 30 min com o seu estado.
 * Fica indisponível o que estiver ocupado no Google Calendar, bloqueado no CMS, já agendado, em
 * feriado nacional ou com menos de MIN_NOTICE_MINUTES de antecedência.
 */
export async function slotGrid({
  first,
  last,
  includeWeekends = false,
  requireGoogle = true,
  now = new Date(),
}: {
  first: string;
  last: string;
  includeWeekends?: boolean;
  /** No CMS, sem o Google conectado, a grade mostra só bloqueios e calls (o site exige a conexão). */
  requireGoogle?: boolean;
  now?: Date;
}) {
  const from = slotStart(first, "00:00");
  const to = slotStart(addDays(last, 1), "00:00");
  const db = getDb();
  const google = async <T,>(run: () => Promise<T>, fallback: T) => {
    try {
      return await run();
    } catch (error) {
      if (!requireGoogle && error instanceof CalendarNotConfiguredError) return fallback;
      throw error;
    }
  };
  const [busy, holidayMap, blocks, booked] = await Promise.all([
    google(() => busyIntervals(from, to), [] as Interval[]),
    google(() => holidays(from, to), {} as Record<string, string>),
    db.select().from(availabilityBlocks).where(and(lt(availabilityBlocks.startsAt, to), gt(availabilityBlocks.endsAt, from))).orderBy(asc(availabilityBlocks.startsAt)),
    db
      .select()
      .from(bookings)
      .where(and(gte(bookings.startsAt, from), lt(bookings.startsAt, to), ne(bookings.status, "cancelado"))),
  ]);
  const minStart = new Date(now.getTime() + MIN_NOTICE_MINUTES * 60_000);

  const days: (DaySlots & { blocks: typeof blocks })[] = [];
  for (let date = first; date <= last; date = addDays(date, 1)) {
    if (!includeWeekends && !WEEKDAYS.includes(weekdayOf(date))) continue;
    const dayStart = slotStart(date, "00:00");
    const dayEnd = slotStart(addDays(date, 1), "00:00");
    const dayBlocks = blocks.filter((b) => overlaps({ start: b.startsAt, end: b.endsAt }, { start: dayStart, end: dayEnd }));
    const slots = SLOT_TIMES.map((time) => {
      const start = slotStart(date, time);
      const slot = { start, end: slotEnd(start) };
      const booking = booked.find((b) => b.startsAt.getTime() === start.getTime());
      const block = dayBlocks.find((b) => overlaps({ start: b.startsAt, end: b.endsAt }, slot));
      let state: SlotState = "free";
      let label: string | undefined;
      const extra: { blockId?: string; diagnosticId?: string | null; bookingId?: string } = {};
      if (booking) {
        [state, label] = ["booked", `${booking.name} · ${booking.business}`];
        Object.assign(extra, { diagnosticId: booking.diagnosticId, bookingId: booking.id });
      }
      else if (holidayMap[date]) [state, label] = ["holiday", holidayMap[date]];
      else if (block) {
        [state, label] = ["blocked", block.reason || "Bloqueado"];
        extra.blockId = block.id;
      }
      else if (busy.some((b) => overlaps(b, slot))) [state, label] = ["busy", "Ocupado no Google Calendar"];
      else if (start < minStart) state = "past";
      return { time, start: start.toISOString(), state, label, ...extra };
    });
    days.push({ date, holiday: holidayMap[date], slots, blocks: dayBlocks });
  }
  return days;
}

/** O que o site mostra: só dias com algum horário livre, e só os horários livres. */
export async function publicSlots(now = new Date()) {
  const { first, last } = bookingRange(now);
  const grid = await slotGrid({ first, last, now });
  return grid
    .map((d) => ({ date: d.date, times: d.slots.filter((s) => s.state === "free").map((s) => ({ time: s.time, start: s.start })) }))
    .filter((d) => d.times.length > 0);
}

/** Confere se um horário específico está livre agora (na hora de confirmar o agendamento). */
export async function isSlotFree(start: Date, now = new Date()) {
  const date = localDate(start);
  const time = localTime(start);
  if (!SLOT_TIMES.includes(time)) return false;
  const [day] = await slotGrid({ first: date, last: date, now });
  return day?.slots.find((s) => s.time === time)?.state === "free";
}

