import { describe, expect, it } from "vitest";
import { projectsByService, serviceOfCategory } from "@/lib/projects/service-match";
import type { PublicProject } from "@/lib/projects/types";

describe("categoria do projeto → serviço da landing", () => {
  it.each([
    ["Landing page", "sites"],
    ["Blog", "sites"],
    ["Site institucional", "sites"],
    ["Central de ajuda", "sistemas"],
    ["Cadastro", "sistemas"],
    ["Sistema de gestão", "sistemas"],
    ["CRM comercial", "sistemas"],
    ["Loja virtual", "lojas"],
    ["E-commerce", "lojas"],
    ["Aplicativo de delivery", "aplicativos"],
    ["App", "aplicativos"],
    ["Identidade visual", "identidade"],
  ])("%s → %s", (category, service) => {
    expect(serviceOfCategory(category)).toBe(service);
  });

  it("categoria desconhecida não ilustra nenhum serviço", () => {
    expect(serviceOfCategory("Consultoria")).toBeNull();
  });

  it("agrupa só projetos reais, na ordem recebida", () => {
    const project = (slug: string, category: string, sample = false) => ({ slug, category, sample }) as PublicProject;
    const groups = projectsByService([
      project("mmv", "Landing page"),
      project("exemplo", "Site institucional", true),
      project("blog", "Blog"),
      project("ajuda", "Central de ajuda"),
    ]);
    expect(groups.sites?.map((p) => p.slug)).toEqual(["mmv", "blog"]);
    expect(groups.sistemas?.map((p) => p.slug)).toEqual(["ajuda"]);
    expect(groups.lojas).toBeUndefined();
  });
});
