/**
 * Cria o primeiro Owner do CMS de forma segura.
 *
 *   npm run cms:bootstrap-owner -- --email pessoa@empresa.com --name "Nome Sobrenome"
 *
 * Nenhuma senha passa pela linha de comando: o script cria a conta como convidada e imprime
 * um link de uso único (válido por 7 dias) onde a própria pessoa define a senha.
 * Recusa rodar se já existir um Owner ativo: depois disso, novos usuários entram pelo próprio CMS.
 */

import { parseArgs } from "node:util";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import * as schema from "../src/server/db/schema";
import { OWNER_ROLE_KEY } from "../src/server/authz/permissions";
import { generateToken, hashToken } from "../src/server/auth/tokens";

const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });

const input = z
  .object({ email: z.string().trim().toLowerCase().email(), name: z.string().trim().min(2).max(120) })
  .safeParse(values);
if (!input.success) {
  console.error('Uso: npm run cms:bootstrap-owner -- --email pessoa@empresa.com --name "Nome Sobrenome"');
  process.exit(1);
}

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const siteUrl = process.env.CMS_URL || process.env.NEXT_PUBLIC_SITE_URL;
if (!url || !siteUrl) {
  console.error("Defina DATABASE_URL (ou DATABASE_URL_UNPOOLED) e NEXT_PUBLIC_SITE_URL (ou CMS_URL).");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });
const db = drizzle(pool, { schema });

try {
  const link = await db.transaction(async (tx) => {
    const ownerRole = await tx.query.roles.findFirst({ where: eq(schema.roles.key, OWNER_ROLE_KEY) });
    if (!ownerRole) throw new Error("Função owner não encontrada. Rode `npm run db:seed` antes.");

    const activeOwner = await tx.query.users.findFirst({
      where: and(eq(schema.users.roleId, ownerRole.id), eq(schema.users.status, "active")),
    });
    if (activeOwner) throw new Error("Já existe um Owner ativo. Convide novos usuários pelo CMS.");

    const existing = await tx.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${input.data.email}` });
    const userId =
      existing?.id ??
      (
        await tx
          .insert(schema.users)
          .values({ email: input.data.email, name: input.data.name, roleId: ownerRole.id, status: "invited" })
          .returning({ id: schema.users.id })
      )[0].id;
    if (existing) {
      await tx.update(schema.users).set({ roleId: ownerRole.id, name: input.data.name }).where(eq(schema.users.id, userId));
    }

    const token = generateToken(32);
    await tx.insert(schema.userTokens).values({
      id: hashToken(token),
      userId,
      type: "invite",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await tx.insert(schema.auditLogs).values({
      action: "user.bootstrap_owner",
      resourceType: "user",
      resourceId: userId,
      summary: `Owner inicial criado pela linha de comando: ${input.data.email}`,
    });
    return `${new URL(siteUrl).origin}/cms/convite/${token}`;
  });

  console.log("\nOwner criado. Abra o link abaixo para definir a senha (uso único, válido por 7 dias):\n");
  console.log(`  ${link}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
