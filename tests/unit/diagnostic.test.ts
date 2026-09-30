import { describe, expect, it } from "vitest";
import { diagnosticSchema, isValidPhone, maskPhone, phoneDigits, PROBLEMS, SEGMENTS, PRESENCE, TIMING, summarize } from "@/lib/diagnostic";

const valid = {
  name: "Ana",
  business: "Studio Ana",
  segment: SEGMENTS[1],
  presence: PRESENCE[0],
  problems: [PROBLEMS[0], PROBLEMS[4]],
  timing: TIMING[1],
  whatsapp: "(11) 98765-4321",
};

describe("diagnóstico", () => {
  it("aceita respostas completas", () => {
    expect(diagnosticSchema.safeParse(valid).success).toBe(true);
  });

  it("recusa opção fora da lista, nenhum problema e campos vazios", () => {
    expect(diagnosticSchema.safeParse({ ...valid, segment: "Qualquer coisa" }).success).toBe(false);
    expect(diagnosticSchema.safeParse({ ...valid, problems: [] }).success).toBe(false);
    expect(diagnosticSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("valida WhatsApp brasileiro com DDD, com ou sem 55", () => {
    expect(isValidPhone("11987654321")).toBe(true);
    expect(isValidPhone("+55 (11) 98765-4321")).toBe(true);
    expect(isValidPhone("1133334444")).toBe(true);
    expect(isValidPhone("987654321")).toBe(false);
    expect(isValidPhone("01987654321")).toBe(false);
    expect(phoneDigits("+55 11 98765-4321")).toBe("11987654321");
  });

  it("aplica a máscara enquanto digita", () => {
    expect(maskPhone("1")).toBe("(1");
    expect(maskPhone("119876")).toBe("(11) 9876");
    expect(maskPhone("1133334444")).toBe("(11) 3333-4444");
    expect(maskPhone("11987654321999")).toBe("(11) 98765-4321");
  });

  it("resume as respostas para a equipe", () => {
    expect(summarize(valid)).toContain("• Problemas que enxerga: Um site que vende, não só uma vitrine, Aparecer no Google pra quem já procura");
  });
});
