/**
 * Seed idempotente do CMS. Pode rodar quantas vezes for preciso.
 *
 * - Sincroniza o catálogo de permissões com o código (src/server/authz/permissions.ts).
 * - Cria as funções padrão que ainda não existem. Funções já existentes não são alteradas,
 *   exceto a de owner, que sempre recebe todas as permissões.
 * - Cria as seções da landing que ainda não existem, já publicadas com o conteúdo atual do site.
 *
 * Não cria usuários. O primeiro owner é criado por `npm run cms:bootstrap-owner`.
 */

import { notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/server/db/schema";
import { ALL_PERMISSIONS, DEFAULT_ROLES, OWNER_ROLE_KEY, PERMISSIONS } from "../src/server/authz/permissions";
import { DEFAULT_CONTENT } from "../src/lib/content/defaults";
import { SECTION_KEYS } from "../src/lib/content/schemas";

export async function seed(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const db = drizzle(pool, { schema });

  try {
    await db.transaction(async (tx) => {
      // 1. Permissões: insere novas, atualiza descrições e remove as que saíram do código.
      for (const key of ALL_PERMISSIONS) {
        await tx
          .insert(schema.permissions)
          .values({ key, description: PERMISSIONS[key] })
          .onConflictDoUpdate({ target: schema.permissions.key, set: { description: PERMISSIONS[key] } });
      }
      await tx.delete(schema.permissions).where(notInArray(schema.permissions.key, ALL_PERMISSIONS));

      // 2. Funções padrão.
      for (const role of DEFAULT_ROLES) {
        const [row] = await tx
          .insert(schema.roles)
          .values({ key: role.key, name: role.name, description: role.description, isSystem: role.isSystem })
          .onConflictDoNothing({ target: schema.roles.key })
          .returning({ id: schema.roles.id });

        const created = Boolean(row);
        const roleId = row?.id ?? (await tx.query.roles.findFirst({ where: (r, { eq }) => eq(r.key, role.key) }))!.id;

        // O Gestor do Alliance nasce na migration 0005; num banco novo as permissões de mídia ainda não
        // existiam nesse momento, então o seed completa as dele (sem remover nada).
        if (created || role.key === OWNER_ROLE_KEY || role.key === "alliance_manager") {
          const perms = role.key === OWNER_ROLE_KEY ? ALL_PERMISSIONS : role.permissions;
          await tx
            .insert(schema.rolePermissions)
            .values(perms.map((permissionKey) => ({ roleId, permissionKey })))
            .onConflictDoNothing();
        }
      }

      // 3. Seções: criadas uma única vez, publicadas com o conteúdo atual do site.
      for (const key of SECTION_KEYS) {
        const content = DEFAULT_CONTENT[key];
        await tx
          .insert(schema.contentSections)
          .values({ key, draft: content, published: content, publishedAt: new Date() })
          .onConflictDoNothing({ target: schema.contentSections.key });
      }
    });

    const counts = await db.execute<{ permissions: number; roles: number; sections: number }>(sql`
      SELECT (SELECT count(*) FROM permissions)::int AS permissions,
             (SELECT count(*) FROM roles)::int AS roles,
             (SELECT count(*) FROM content_sections)::int AS sections`);
    return counts.rows[0];
  } finally {
    await pool.end();
  }
}

// Execução direta: npm run db:seed
if (process.argv[1]?.endsWith("seed.mts")) {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.error("Defina DATABASE_URL_UNPOOLED ou DATABASE_URL.");
    process.exit(1);
  }
  seed(url)
    .then((counts) => console.log("Seed concluído:", counts))
    .catch((error) => {
      console.error("Seed falhou:", error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
