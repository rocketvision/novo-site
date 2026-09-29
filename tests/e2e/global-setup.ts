import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import pg from "pg";
import sharp from "sharp";

/**
 * Prepara o banco de e2e do zero: migrations reais, seed, e duas contas de teste com senhas aleatórias
 * (owner, colaborador, editora e colunista). Nada disso vai para o Git: as senhas ficam em tests/e2e/.state (ignorado).
 */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL_E2E;
  if (!url || !new URL(url).pathname.endsWith("_e2e")) throw new Error("Defina DATABASE_URL_E2E apontando para um banco terminado em _e2e.");

  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await admin.end();

  // O cache de dados do Next (unstable_cache) guarda conteúdo publicado da execução anterior:
  // com o banco recriado, ele precisa ser apagado junto.
  rmSync(".next/dev/cache/fetch-cache", { recursive: true, force: true });

  const env = { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url };
  execFileSync("npx", ["drizzle-kit", "migrate"], { env, stdio: "pipe" });
  execFileSync("npx", ["tsx", "scripts/seed.mts"], { env, stdio: "pipe" });

  const accounts = {
    owner: { email: "owner.e2e@rocketvision.local", name: "Owner E2E", role: "owner", password: randomBytes(18).toString("base64url") },
    collaborator: { email: "colab.e2e@rocketvision.local", name: "Colaboradora E2E", role: "collaborator", password: randomBytes(18).toString("base64url") },
    editor: { email: "editor.e2e@rocketvision.local", name: "Editora E2E", role: "editor", password: randomBytes(18).toString("base64url") },
    columnist: { email: "colunista.e2e@exemplo.com", name: "Colunista E2E", role: "columnist", password: randomBytes(18).toString("base64url") },
  };

  const db = new pg.Client({ connectionString: url });
  await db.connect();
  for (const a of Object.values(accounts)) {
    const passwordHash = await hash(a.password, { memoryCost: 47104, timeCost: 1, parallelism: 1 });
    await db.query(
      "INSERT INTO users (email, name, password_hash, status, role_id) SELECT $1, $2, $3, 'active', id FROM roles WHERE key = $4",
      [a.email, a.name, passwordHash, a.role],
    );
  }
  await db.end();

  mkdirSync("tests/e2e/.state", { recursive: true });
  writeFileSync("tests/e2e/.state/accounts.json", JSON.stringify(accounts));
  // Imagem de teste gerada na hora (nenhum arquivo binário no repositório).
  await sharp({ create: { width: 1600, height: 1000, channels: 3, background: "#1e3a8a" } })
    .composite([{ input: Buffer.from('<svg width="1600" height="1000"><rect x="200" y="200" width="1200" height="600" rx="40" fill="#f8fafc"/></svg>') }])
    .jpeg()
    .toFile("tests/e2e/.state/tela.jpg");
}
