import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { seed } from "../../scripts/seed.mjs";

/**
 * Recria o banco de teste do zero: aplica as migrations reais (as mesmas de produção) e o seed.
 * Protegido para nunca rodar fora de um banco cujo nome termine em _test.
 */
export async function resetTestDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith("_test")) {
    throw new Error("Os testes de integração só rodam em um banco cujo nome termina com _test.");
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool, { schema });
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
  await seed(url);
}

export async function createUser(
  db: import("@/server/db").Db,
  input: { email: string; name?: string; roleKey: string; password?: string; status?: "active" | "invited" | "disabled" },
) {
  const role = await db.query.roles.findFirst({ where: (r, { eq }) => eq(r.key, input.roleKey) });
  if (!role) throw new Error(`Função ${input.roleKey} não existe.`);
  const [user] = await db
    .insert(schema.users)
    .values({
      email: input.email,
      name: input.name ?? "Pessoa Teste",
      roleId: role.id,
      status: input.status ?? "active",
      passwordHash: input.password ? await hashPassword(input.password) : null,
    })
    .returning();
  return user;
}
