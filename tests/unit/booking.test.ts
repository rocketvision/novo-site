import { describe, expect, it } from "vitest";
import { addDays, blockSchema, googleCalendarLink, localDate, localTime, SLOT_TIMES, slotEnd, slotStart, weekdayOf } from "@/lib/booking";

describe("regras de horário da agenda", () => {
  it("gera os horários de 30 min das duas janelas", () => {
    expect(SLOT_TIMES).toEqual(["09:00", "09:30", "10:00", "10:30", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"]);
  });

  it("converte hora local de Brasília em instante e de volta", () => {
    const start = slotStart("2026-10-05", "09:30");
    expect(start.toISOString()).toBe("2026-10-05T12:30:00.000Z");
    expect(localTime(start)).toBe("09:30");
    expect(localDate(start)).toBe("2026-10-05");
    expect(slotEnd(start).toISOString()).toBe("2026-10-05T13:00:00.000Z");
  });

  it("calcula dia da semana e soma dias", () => {
    expect(weekdayOf("2026-10-05")).toBe(1); // segunda
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("valida bloqueios: dia inteiro ou intervalo completo", () => {
    expect(blockSchema.safeParse({ date: "2026-10-05" }).success).toBe(true);
    expect(blockSchema.safeParse({ date: "2026-10-05", from: "09:00", to: "11:00", reason: "Viagem" }).success).toBe(true);
    expect(blockSchema.safeParse({ date: "2026-10-05", from: "09:00" }).success).toBe(false);
    expect(blockSchema.safeParse({ date: "2026-10-05", from: "11:00", to: "09:00" }).success).toBe(false);
  });

  it("monta o link para salvar na agenda", () => {
    const url = googleCalendarLink({ start: slotStart("2026-10-05", "09:00"), end: slotStart("2026-10-05", "09:30"), title: "Call", details: "Meet" });
    expect(url).toContain("dates=20261005T120000Z%2F20261005T123000Z");
  });
});
