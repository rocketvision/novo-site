import { describe, expect, it } from "vitest";
import { realProjects } from "@/lib/projects/service-match";
import type { PublicProject } from "@/lib/projects/types";

describe("projetos da landing", () => {
  it("mantém só projetos reais, na ordem recebida", () => {
    const project = (slug: string, sample = false) => ({ slug, sample }) as PublicProject;
    const real = realProjects([project("mmv"), project("exemplo", true), project("blog"), project("ajuda")]);
    expect(real.map((p) => p.slug)).toEqual(["mmv", "blog", "ajuda"]);
  });
});
