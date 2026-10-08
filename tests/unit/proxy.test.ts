import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** O proxy lê os endereços ao carregar o módulo: cada teste carrega uma cópia nova com o ambiente de produção. */
async function load() {
  vi.resetModules();
  return (await import("@/proxy")).proxy;
}

const request = (url: string, cookies = "") =>
  new NextRequest(url, { headers: { host: new URL(url).host, ...(cookies && { cookie: cookies }) } });

describe("proxy: endereço próprio do Alliance Hub", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.rocketvision.dev");
    vi.stubEnv("CMS_URL", "https://cms.rocketvision.dev");
    vi.stubEnv("ALLIANCE_URL", "https://alliance.rocketvision.dev");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("a raiz do endereço do Hub leva ao Hub", async () => {
    const res = (await load())(request("https://alliance.rocketvision.dev/"));
    expect(res.headers.get("location")).toBe("https://alliance.rocketvision.dev/alliance");
  });

  it("o Hub aberto no site ou na prévia vai para o endereço do Hub", async () => {
    const proxy = await load();
    for (const host of ["www.rocketvision.dev", "preview.rocketvision.dev"]) {
      const res = proxy(request(`https://${host}/alliance/login?next=%2Falliance`));
      expect(res.status).toBe(308);
      expect(res.headers.get("location")).toBe("https://alliance.rocketvision.dev/alliance/login?next=%2Falliance");
    }
  });

  it("no endereço do Hub, páginas do site voltam ao site e o CMS ao endereço do CMS", async () => {
    const proxy = await load();
    expect(proxy(request("https://alliance.rocketvision.dev/projetos")).headers.get("location")).toBe("https://www.rocketvision.dev/projetos");
    expect(proxy(request("https://alliance.rocketvision.dev/cms/login")).headers.get("location")).toBe("https://cms.rocketvision.dev/cms/login");
  });

  it("no endereço do Hub, sem sessão, vai para o login do Hub", async () => {
    const res = (await load())(request("https://alliance.rocketvision.dev/alliance/ganhos"));
    expect(res.headers.get("location")).toBe("https://alliance.rocketvision.dev/alliance/login?next=%2Falliance%2Fganhos");
  });

  it("sem ALLIANCE_URL, o Hub continua em /alliance no endereço do site", async () => {
    vi.stubEnv("ALLIANCE_URL", "");
    const res = (await load())(request("https://www.rocketvision.dev/alliance/login"));
    expect(res.headers.get("location")).toBeNull();
  });
});
