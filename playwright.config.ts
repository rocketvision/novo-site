import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

/**
 * Testes ponta a ponta do CMS: sobem o site com um banco isolado (DATABASE_URL_E2E, nome terminado em _e2e)
 * e usam o navegador como uma pessoa usaria. O banco é recriado a cada execução (tests/e2e/global-setup.ts).
 *
 *   npm run test:e2e
 */
config({ path: [".env.test.local", ".env.local"], quiet: true });

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const databaseUrl = process.env.DATABASE_URL_E2E ?? "";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure", locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `${baseURL}/cms/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: databaseUrl, DATABASE_URL_UNPOOLED: databaseUrl, NEXT_PUBLIC_SITE_URL: baseURL, BLOB_READ_WRITE_TOKEN: "", RESEND_API_KEY: "", MAIL_FROM: "" },
  },
});
