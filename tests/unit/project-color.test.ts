import { describe, expect, it } from "vitest";
import { contrastRatio, readableAccent } from "@/lib/projects/color";

describe("cor de destaque dos projetos", () => {
  it("calcula o contraste WCAG", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });

  it("usa a cor só quando ela é legível sobre o fundo", () => {
    expect(readableAccent("#ffc400", "#111014")).toBe("#ffc400");
    // Creme sobre o papel claro some: cai para a cor de texto da página.
    expect(readableAccent("#ffd6d2", "#fbfbfd")).toBeUndefined();
  });
});
