import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT } from "@/lib/content/defaults";
import { SECTION_KEYS, SECTION_SCHEMAS, href, turnSchema } from "@/lib/content/schemas";

describe("conteúdo inicial", () => {
  it.each(SECTION_KEYS)("a seção %s passa no schema", (key) => {
    const result = SECTION_SCHEMAS[key].safeParse(DEFAULT_CONTENT[key]);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });
});

describe("links", () => {
  it.each(["/projetos", "#contato", "https://rocketvision.com.br", "mailto:oi@exemplo.com", "tel:+5514999999999"])(
    "aceita %s",
    (value) => expect(href.safeParse(value).success).toBe(true),
  );

  it.each(["javascript:alert(1)", "JavaScript:alert(1)", "data:text/html,x", "//evil.com", "http://inseguro.com", "ftp://x"])(
    "recusa %s",
    (value) => expect(href.safeParse(value).success).toBe(false),
  );
});

describe("travessão", () => {
  it("é recusado em textos", () => {
    const result = turnSchema.safeParse({ from: "Tecnologia \u2014 complicar", strike: "complicar", to: "Avançar." });
    expect(result.success).toBe(false);
  });

  it("exige que a palavra riscada esteja na frase", () => {
    const result = turnSchema.safeParse({ from: "Tecnologia não deveria complicar.", strike: "atrapalhar", to: "Avançar." });
    expect(result.success).toBe(false);
  });
});
