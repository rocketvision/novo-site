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

describe("conteúdo salvo antes da direção de arte atual", () => {
  const oldImage = (fallback: string) => ({ mediaId: null, alt: "Foto antiga", fallback });

  it("continua válido e descarta as fotos que as seções não usam mais", () => {
    const shift = {
      ...DEFAULT_CONTENT.shift,
      groups: DEFAULT_CONTENT.shift.groups.map((g, i) => ({ ...g, image: oldImage(`shift-${i}`) })),
    };
    const parsed = SECTION_SCHEMAS.shift.safeParse(shift);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(parsed.data?.groups.every((g) => !("image" in g))).toBe(true);

    const services = {
      ...DEFAULT_CONTENT.services,
      items: DEFAULT_CONTENT.services.items.map((s) => ({ ...s, image: oldImage("service-site") })),
    };
    expect(SECTION_SCHEMAS.services.safeParse(services).success).toBe(true);
    expect(SECTION_SCHEMAS.statement.safeParse({ ...DEFAULT_CONTENT.statement, image: oldImage("statement") }).success).toBe(true);
  });

  it("descarta as fotos que diferenciais, processo e convite final tinham", () => {
    const workflow = {
      ...DEFAULT_CONTENT.workflow,
      image: oldImage("workflow"),
      steps: DEFAULT_CONTENT.workflow.steps.map((s, i) => ({ ...s, image: oldImage(`workflow-${i}`) })),
    };
    const parsedWorkflow = SECTION_SCHEMAS.workflow.safeParse(workflow);
    expect(parsedWorkflow.success, JSON.stringify(parsedWorkflow.error?.issues)).toBe(true);
    expect(parsedWorkflow.data).not.toHaveProperty("image");

    for (const key of ["differentials", "cta"] as const) {
      const parsed = SECTION_SCHEMAS[key].safeParse({ ...DEFAULT_CONTENT[key], image: oldImage(key) });
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
      expect(parsed.data).not.toHaveProperty("image");
    }
  });

  it("abertura antiga: descarta a foto, o rótulo, a garantia e os cartões", () => {
    const legacy = {
      ...DEFAULT_CONTENT.hero,
      image: oldImage("hero"),
      eyebrow: "Sites, lojas virtuais, sistemas e aplicativos",
      proof: { title: "Você fala com quem constrói", text: "Sem intermediários, do início ao fim" },
      highlights: [{ value: "Sob medida", label: "Feito para o seu negócio" }],
    };
    const parsed = SECTION_SCHEMAS.hero.safeParse(legacy);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    for (const key of ["image", "eyebrow", "proof", "highlights"]) expect(parsed.data).not.toHaveProperty(key);
    expect(parsed.data).toEqual(DEFAULT_CONTENT.hero);
  });
});
