import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Blog: a Colunista escreve e envia para revisão; a editora aprova e publica; o visitante lê.
 * Roda em sequência: cada etapa depende da anterior.
 */
test.describe.configure({ mode: "serial" });
// IP próprio: os logins daqui não consomem o limite por IP que os testes do CMS verificam.
test.use({ extraHTTPHeaders: { "x-real-ip": "198.51.100.23" } });

type Account = { email: string; password: string };
const accounts = () => JSON.parse(readFileSync("tests/e2e/.state/accounts.json", "utf8")) as { editor: Account; columnist: Account };
const TITLE = "Autenticação sem senha na prática";
const SLUG = "autenticacao-sem-senha-na-pratica";
let articlePath = "";

async function login(page: Page, account: Account) {
  await page.goto("/cms/login");
  await page.getByLabel("E-mail").fill(account.email);
  await page.getByLabel("Senha").fill(account.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"));
}

test("Colunista entra direto no Blog e vê só o Blog e a própria conta", async ({ page }) => {
  await login(page, accounts().columnist);
  await expect(page).toHaveURL(/\/cms\/blog$/);
  const nav = page.getByRole("navigation", { name: "Principal" });
  await expect(nav.getByRole("link", { name: "Blog" })).toBeVisible();
  for (const hidden of ["Visão geral", "Landing page", "Projetos", "Mídia", "Usuários", "Auditoria", "Configurações"]) {
    await expect(nav.getByRole("link", { name: hidden })).toHaveCount(0);
  }
  for (const path of ["/cms/projetos", "/cms/usuarios", "/cms/midia", "/cms/auditoria"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(403);
  }
});

test("Colunista escreve e envia para revisão", async ({ page }) => {
  await login(page, accounts().columnist);
  await page.goto("/cms/blog/novo");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Título").first().fill(TITLE);
  await page.locator(".rv-editor-content").click();
  await page.keyboard.type("Passkeys substituem senhas por um par de chaves criptográficas guardado no dispositivo. ".repeat(20));
  await page.getByLabel("Resumo").fill("Como passkeys funcionam, por que resistem a phishing e como começar a adotar sem travar os usuários.");
  await page.getByRole("button", { name: "Criar rascunho" }).click();
  await page.waitForURL(/\/cms\/blog\/[0-9a-f-]{36}$/);
  articlePath = new URL(page.url()).pathname;
  await page.getByRole("button", { name: "Enviar para revisão" }).click();
  await expect(page.getByText("Artigo enviado para revisão.")).toBeVisible();
  // Rascunho em revisão não aparece no site.
  expect((await page.goto(`/blog/${SLUG}`))?.status()).toBe(404);
});

test("Editora aprova e publica; o visitante lê", async ({ page, browser }) => {
  await login(page, accounts().editor);
  await page.goto(articlePath);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Categoria").selectOption({ label: "Cibersegurança" });
  await page.getByRole("button", { name: "Escolher capa" }).click();
  const dialog = page.locator("dialog[open]");
  await dialog.locator('input[type="file"]').setInputFiles("tests/e2e/.state/tela.jpg");
  await dialog.getByRole("button", { name: "Usar imagem" }).click({ timeout: 30_000 });
  await page.getByLabel("Texto alternativo").fill("Tela de login com passkey");
  await page.getByRole("button", { name: "Aprovar" }).click();
  await expect(page.getByText("Artigo aprovado.")).toBeVisible();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.locator("dialog[open]").getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Artigo publicado.")).toBeVisible();

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/blog/${SLUG}`);
  await expect(visitor.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
  await expect(visitor.getByText("Colunista convidado").first()).toBeVisible();
  await visitor.goto("/blog");
  await expect(visitor.getByRole("link", { name: TITLE })).toBeVisible();
});
