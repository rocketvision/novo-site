import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// O Google é simulado: ocupado das 14h às 15h de segunda, sem feriados, e cada evento ganha um Meet.
const google = vi.hoisted(() => ({ busy: [] as { start: Date; end: Date }[], created: [] as unknown[], deleted: [] as string[], fail: false }));
vi.mock("@/server/calendar/google", async (orig) => {
  const actual = await orig<typeof import("@/server/calendar/google")>();
  return {
    ...actual,
    busyIntervals: async () => google.busy,
    holidays: async () => ({ "2026-10-12": "Nossa Senhora Aparecida" }),
    createMeetEvent: async (input: unknown) => {
      if (google.fail) throw new Error("google_calendar_500");
      google.created.push(input);
      return { id: `evt-${google.created.length}`, eventUrl: "https://calendar.google.com/e", meetUrl: "https://meet.google.com/abc-defg-hij" };
    },
    deleteEvent: async (id: string) => {
      google.deleted.push(id);
    },
  };
});
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: () => {} }));

import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bookings, diagnostics } from "@/server/db/schema";
import { slotStart } from "@/lib/booking";
import { slotGrid } from "@/server/calendar/availability";
import { bookCall, cancelBooking, createBlock, hashToken, setContactPreference } from "@/server/calendar/bookings";
import { createUser, resetTestDatabase } from "../support/db";
import { NextRequest } from "next/server";
import { rateLimits } from "@/server/db/schema";
import * as agenda from "@/app/api/agenda/route";
import { publicSlots } from "@/server/calendar/availability";

const ORIGIN = "http://localhost:3000";
let ipCounter = 0;
const book = (body: unknown, headers: Record<string, string> = {}) =>
  agenda.POST(
    new NextRequest(`${ORIGIN}/api/agenda`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": `10.1.0.${++ipCounter}`, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({}) },
  );

const NOW = new Date("2026-10-05T09:00:00-03:00"); // segunda, 9h
let diagnosticId: string;
const TOKEN = "token-de-teste-com-tamanho-suficiente";
let actor: { id: string; email: string };

beforeAll(async () => {
  await resetTestDatabase();
  const user = await createUser(getDb(), { email: "agenda@rocketvision.dev", roleKey: "admin", password: "senha-de-teste-longa-1" });
  actor = { id: user.id, email: user.email };
});

beforeEach(async () => {
  google.busy = [{ start: slotStart("2026-10-05", "14:00"), end: slotStart("2026-10-05", "15:00") }];
  google.created = [];
  google.fail = false;
  await getDb().delete(bookings);
  await getDb().delete(diagnostics);
  const [d] = await getDb()
    .insert(diagnostics)
    .values({ name: "Ana", business: "Studio Ana", segment: "x", presence: "y", problems: ["z"], timing: "w", whatsapp: "11987654321", bookingTokenHash: hashToken(TOKEN) })
    .returning();
  diagnosticId = d.id;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

describe("agenda das calls", () => {
  it("marca ocupado no Google, antecedência mínima e feriado", async () => {
    const [monday] = await slotGrid({ first: "2026-10-05", last: "2026-10-05", now: NOW });
    const state = (t: string) => monday.slots.find((s) => s.time === t)?.state;
    expect(state("09:00")).toBe("past"); // menos de 2h de antecedência
    expect(state("10:30")).toBe("past"); // 1h30 de antecedência
    expect(state("13:30")).toBe("free");
    expect(state("14:00")).toBe("busy");
    expect(state("14:30")).toBe("busy");
    expect(state("15:00")).toBe("free");
    const [holiday] = await slotGrid({ first: "2026-10-12", last: "2026-10-12", now: NOW });
    expect(holiday.slots.every((s) => s.state === "holiday")).toBe(true);
    // Fim de semana não entra.
    expect(await slotGrid({ first: "2026-10-10", last: "2026-10-11", now: NOW })).toHaveLength(0);
  });

  it("agenda com Meet, marca a etapa e não deixa agendar de novo", async () => {
    const booking = await bookCall({ diagnosticId, token: TOKEN, start: slotStart("2026-10-06", "10:00"), email: "ana@exemplo.com" });
    expect(booking).toMatchObject({ status: "confirmado", meetUrl: "https://meet.google.com/abc-defg-hij" });
    expect(google.created).toHaveLength(1);
    const [d] = await getDb().select().from(diagnostics).where(eq(diagnostics.id, diagnosticId));
    expect(d).toMatchObject({ contactPreference: "agendou", status: "call_agendada" });
    await expect(bookCall({ diagnosticId, token: TOKEN, start: slotStart("2026-10-06", "10:30") })).rejects.toMatchObject({ status: 409 });
    const [grid] = await slotGrid({ first: "2026-10-06", last: "2026-10-06", now: NOW });
    expect(grid.slots.find((s) => s.time === "10:00")?.state).toBe("booked");
  });

  it("recusa token errado, horário fora da grade e horário ocupado", async () => {
    await expect(bookCall({ diagnosticId, token: "outro-token-qualquer-errado", start: slotStart("2026-10-06", "10:00") })).rejects.toMatchObject({ status: 404 });
    await expect(bookCall({ diagnosticId, token: TOKEN, start: slotStart("2026-10-06", "12:00") })).rejects.toMatchObject({ status: 400 });
    await expect(bookCall({ diagnosticId, token: TOKEN, start: slotStart("2026-10-05", "14:00") })).rejects.toMatchObject({ status: 409 });
  });

  it("se o Google falhar, o horário volta a ficar livre", async () => {
    google.fail = true;
    await expect(bookCall({ diagnosticId, token: TOKEN, start: slotStart("2026-10-06", "15:00") })).rejects.toThrow();
    expect(await getDb().select().from(bookings)).toHaveLength(0);
  });

  it("bloqueio do CMS tira o horário do site; cancelar libera", async () => {
    await createBlock(actor, { date: "2026-10-07", from: "09:00", to: "10:00", reason: "Dentista" });
    const [day] = await slotGrid({ first: "2026-10-07", last: "2026-10-07", now: NOW });
    expect(day.slots.slice(0, 3).map((s) => s.state)).toEqual(["blocked", "blocked", "free"]);
    await expect(bookCall({ diagnosticId, token: TOKEN, start: slotStart("2026-10-07", "09:30") })).rejects.toMatchObject({ status: 409 });

    const booking = await bookCall({ diagnosticId, token: TOKEN, start: slotStart("2026-10-07", "10:00") });
    await cancelBooking(actor, booking.id);
    expect(google.deleted).toContain(booking.googleEventId);
    const [after] = await slotGrid({ first: "2026-10-07", last: "2026-10-07", now: NOW });
    expect(after.slots.find((s) => s.time === "10:00")?.state).toBe("free");
  });

  it("guarda a preferência de quem não agendou", async () => {
    await setContactPreference(diagnosticId, TOKEN, "aguardar");
    const [d] = await getDb().select().from(diagnostics).where(eq(diagnostics.id, diagnosticId));
    expect(d.contactPreference).toBe("aguardar");
  });

  it("token vale só por 7 dias", async () => {
    await getDb().update(diagnostics).set({ createdAt: new Date(NOW.getTime() - 8 * 24 * 3600_000) }).where(eq(diagnostics.id, diagnosticId));
    await expect(bookCall({ diagnosticId, token: TOKEN, start: slotStart("2026-10-06", "10:00") })).rejects.toMatchObject({ status: 404 });
  });
});

describe("proteções da rota de agendamento", () => {
  beforeEach(async () => {
    await getDb().delete(rateLimits);
  });

  it("recusa outra origem, corpo grande demais e não-JSON", async () => {
    const start = slotStart("2026-10-06", "10:00").toISOString();
    expect((await book({ diagnosticId, token: TOKEN, start }, { origin: "https://site-malicioso.com" })).status).toBe(403);
    expect((await book({ diagnosticId, token: TOKEN, start, email: "a".repeat(5000) + "@x.com" })).status).toBe(413);
    expect((await book({ diagnosticId, token: TOKEN, start }, { "content-type": "text/plain" })).status).toBe(415);
  });

  it("limita tentativas por diagnóstico, mesmo vindo de IPs diferentes", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await book({ diagnosticId, token: "token-errado-mas-com-tamanho-ok", start: slotStart("2026-10-06", "10:00").toISOString() })).status);
    expect(statuses.slice(0, 6).every((s) => s === 404)).toBe(true);
    expect(statuses[6]).toBe(429);
  });

  it("agenda pela rota e o horário some da lista pública na hora (cache limpo)", async () => {
    const before = await publicSlots("2026-10", NOW);
    expect(before.days.find((d) => d.date === "2026-10-06")?.times.some((t) => t.time === "10:00")).toBe(true);
    const response = await book({ diagnosticId, token: TOKEN, start: slotStart("2026-10-06", "10:00").toISOString() });
    expect(response.status).toBe(200);
    expect((await response.json()).meetUrl).toContain("meet.google.com");
    const after = await publicSlots("2026-10", NOW);
    expect(after.days.find((d) => d.date === "2026-10-06")?.times.some((t) => t.time === "10:00")).toBe(false);
  });
});
