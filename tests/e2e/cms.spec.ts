import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Fluxo real de uso do CMS, do login à publicação, conferindo o site público como visitante.
 * Roda em sequência: cada etapa depende do estado deixado pela anterior.
 */
test.describe.configure({ mode: "serial" });

type Account = { email: string; password: string };
const accounts = () => JSON.parse(readFileSync("tests/e2e/.state/accounts.json", "utf8")) as { owner: Account; collaborator: Account };

/** Confirma a publicação no diálogo e espera a resposta da API (o botão fica desabilitado já durante o envio). */
async function confirmAndWait(page: Page, button: string, path: RegExp) {
  const done = page.waitForResponse((r) => path.test(new URL(r.url()).pathname) && r.request().method() === "POST");
  await page.getByRole("dialog").getByRole("button", { name: button }).click();
  expect((await done).status()).toBe(200);
}

async function login(page: Page, account: Account, next = "/cms") {
  await page.goto(`/cms/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(account.email);
  await page.getByLabel("Senha").fill(account.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`**${next}`);
}

/** Visitante sem sessão: o que o público vê. */
async function visitor(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

test("rota do CMS sem sessão leva ao login e volta para a página pedida", async ({ page }) => {
  await page.goto("/cms/projetos");
  await expect(page).toHaveURL(/\/cms\/login\?next=%2Fcms%2Fprojetos/);
  const response = await page.request.get("/api/cms/projects");
  expect(response.status()).toBe(401);
  await login(page, accounts().owner, "/cms/projetos");
  await expect(page.getByRole("heading", { name: "Projetos", level: 1 })).toBeVisible();
});

test("senha errada mostra mensagem genérica", async ({ page }) => {
  await page.goto("/cms/login");
  await page.getByLabel("E-mail").fill(accounts().owner.email);
  await page.getByLabel("Senha").fill("senha errada de propósito");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "incorretos" })).toHaveText("E-mail ou senha incorretos.");
});

test("editar o Hero: rascunho não muda o site, pré-visualização mostra, publicar muda", async ({ page, browser }) => {
  await login(page, accounts().owner, "/cms/landing/hero");
  const eyebrow = page.getByLabel("Rótulo");
  const original = await eyebrow.inputValue();

  await eyebrow.fill("Rótulo publicado pelo teste e2e");
  await expect(page.getByText("Alterações não salvas", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo")).toBeVisible();

  const guest = await visitor(browser);
  await guest.goto("/");
  await expect(guest.locator("#inicio p").first()).toHaveText(original);

  const [preview] = await Promise.all([page.context().waitForEvent("page"), page.getByRole("button", { name: "Pré-visualizar" }).click()]);
  await preview.waitForURL("**/");
  await expect(preview.locator("#inicio p").first()).toHaveText("Rótulo publicado pelo teste e2e");
  await expect(preview.getByText("Pré-visualização do rascunho")).toBeVisible();
  await preview.close();

  await page.getByRole("button", { name: "Publicar" }).click();
  await confirmAndWait(page, "Publicar", /\/publish$/);

  await guest.goto("/");
  await expect(guest.locator("#inicio p").first()).toHaveText("Rótulo publicado pelo teste e2e");

  // Volta ao texto original, também pelo CMS.
  await page.getByLabel("Rótulo").fill(original);
  await page.getByRole("button", { name: "Publicar" }).click();
  await confirmAndWait(page, "Publicar", /\/publish$/);
  await guest.goto("/");
  await expect(guest.locator("#inicio p").first()).toHaveText(original);
});

test("projeto: criar com imagem e cor, publicar, editar, republicar e despublicar", async ({ page, browser }) => {
  await login(page, accounts().owner, "/cms/projetos/novo");
  await page.getByLabel("Nome do projeto").fill("Projeto E2E");
  await expect(page.getByLabel("Endereço")).toHaveValue("projeto-e2e");
  await page.getByLabel("Categoria").fill("Sistema web");
  await page.getByLabel("Resumo").fill("Resumo do projeto criado pelo teste ponta a ponta.");
  await page.getByLabel("Cor da marca", { exact: true }).fill("#1e3a8a");

  // Envia a imagem pelo seletor, sem sair do formulário.
  await page.getByRole("button", { name: "Escolher imagem" }).first().click();
  const picker = page.getByRole("dialog");
  await picker.locator('input[type="file"]').setInputFiles("tests/e2e/.state/tela.jpg");
  await expect(picker.getByText("1600×1000").first()).toBeVisible();
  await picker.getByRole("button", { name: "Usar imagem" }).click();

  await page.getByRole("button", { name: "Criar rascunho" }).click();
  await page.waitForURL(/\/cms\/projetos\/[0-9a-f-]{36}$/);

  const guest = await visitor(browser);
  expect((await guest.goto("/projetos/projeto-e2e"))?.status()).toBe(404);

  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await confirmAndWait(page, "Publicar", /\/publish$/);
  await expect(page.getByText("Projeto publicado.")).toBeVisible();

  expect((await guest.goto("/projetos/projeto-e2e"))?.status()).toBe(200);
  await expect(guest.getByRole("heading", { level: 1 })).toHaveText("Projeto E2E");
  await expect(guest.getByText("Resumo do projeto criado pelo teste ponta a ponta.")).toBeVisible();
  // Cor da marca aplicada na abertura, com texto claro (tom sugerido pelo contraste).
  await expect(guest.locator("section").first()).toHaveCSS("background-color", "rgb(30, 58, 138)");
  await guest.goto("/projetos");
  await expect(guest.getByText("Projeto E2E").first()).toBeVisible();

  await page.getByLabel("Resumo").fill("Resumo editado depois de publicado.");
  const saved = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/api/cms/projects/"));
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByText("Alterações não publicadas", { exact: true })).toBeVisible();
  await guest.goto("/projetos/projeto-e2e");
  await expect(guest.getByText("Resumo do projeto criado pelo teste ponta a ponta.")).toBeVisible();

  await page.getByRole("button", { name: "Publicar alterações" }).click();
  await confirmAndWait(page, "Publicar", /\/publish$/);
  await guest.goto("/projetos/projeto-e2e");
  await expect(guest.getByText("Resumo editado depois de publicado.")).toBeVisible();

  await page.getByRole("button", { name: "Despublicar" }).click();
  await confirmAndWait(page, "Despublicar", /\/unpublish$/);
  expect((await guest.goto("/projetos/projeto-e2e"))?.status()).toBe(404);
  await expect(guest.getByRole("heading", { level: 1 })).toContainText("Esta página");
});

test("colaborador: sem publicar, sem usuários, bloqueado também na API", async ({ page }) => {
  await login(page, accounts().collaborator);
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByRole("link", { name: "Usuários" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Auditoria" })).toHaveCount(0);

  expect((await page.goto("/cms/usuarios"))?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Sem permissão" })).toBeVisible();
  expect((await page.goto("/cms/auditoria"))?.status()).toBe(403);

  await page.goto("/cms/landing/hero");
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publicar" })).toHaveCount(0);

  const status = await page.evaluate(async () => {
    const section = await (await fetch("/api/cms/sections/hero")).json();
    const publish = await fetch("/api/cms/sections/hero/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: section.section.version }) });
    const users = await fetch("/api/cms/users");
    return [publish.status, users.status];
  });
  expect(status).toEqual([403, 403]);
});

test("mutação de outra origem é recusada (CSRF)", async ({ page }) => {
  await login(page, accounts().owner);
  const response = await page.request.post("/api/cms/auth/logout", { headers: { Origin: "https://evil.example" } });
  expect(response.status()).toBe(403);
});

test("força bruta no login recebe 429", async ({ page }) => {
  const email = "alvo.inexistente@rocketvision.local";
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) {
    const r = await page.request.post("/api/cms/auth/login", { data: { email, password: `errada-${i}` }, headers: { Origin: "http://localhost:3100" } });
    statuses.push(r.status());
  }
  expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
  expect(statuses[5]).toBe(429);
});

test("celular: menu do CMS sem rolagem horizontal", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  // Outra conta: o owner já usou as 5 tentativas por e-mail da janela de 15 minutos (o limite também vale para logins certos).
  await login(page, accounts().collaborator);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Mídia" }).click();
  await page.waitForURL("**/cms/midia");
  await expect(page.getByRole("heading", { name: "Mídia", level: 1 })).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});
