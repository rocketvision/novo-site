/**
 * Artigos iniciais do Blog: cria cada artigo como rascunho enviado para revisão ("Em revisão"),
 * assinado pela "Redação Rocket Vision", com a capa autoral gerada em código.
 * Nada é publicado: a publicação passa pelo fluxo editorial no Studio.
 *
 * Usa os mesmos serviços do Studio (validação do documento, processamento da imagem, revisões e auditoria).
 * Idempotente: artigos cujo endereço já existe são pulados.
 *
 *   npm run db:seed-blog        (usa DATABASE_URL e o armazenamento de mídia configurado)
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/server/db";
import { createSession, hashToken, validateSessionToken, type SessionUser } from "../src/server/auth/session";
import { uploadMedia } from "../src/server/media/service";
import { addComment, createArticle, transitionArticle } from "../src/server/blog/service";
import { articleInputSchema } from "../src/lib/validation/blog";
import { documentStats } from "../src/lib/blog/document";
import { coverSvg } from "./blog-seed/covers";
import { markdownToDocument, splitFrontMatter } from "./blog-seed/markdown";

const ctx = { ip: null, userAgent: "seed-blog" };
const DIR = path.join(process.cwd(), "scripts", "blog-seed", "articles");

/** Sessão de sistema de um owner ativo: as gravações ficam auditadas em nome de quem roda o seed. */
async function actor(): Promise<SessionUser> {
  const db = getDb();
  const email = process.env.SEED_BLOG_AS;
  const rows = await db
    .select({ id: schema.users.id, email: schema.users.email, roleKey: schema.roles.key })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(eq(schema.users.status, "active"));
  const user = rows.find((r) => (email ? r.email === email : r.roleKey === "owner"));
  if (!user) throw new Error(email ? `Usuário ${email} não encontrado.` : "Nenhum owner ativo.");
  const { token } = await createSession(user.id, ctx);
  const session = await validateSessionToken(token);
  // Só a sessão temporária criada aqui é apagada: as sessões reais da pessoa continuam valendo.
  await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  return session!.user;
}

export async function seedBlog() {
  const db = getDb();
  const user = await actor();
  const [redacao] = await db.select().from(schema.blogAuthors).where(eq(schema.blogAuthors.slug, "redacao-rocket-vision"));
  if (!redacao) throw new Error("Autor Redação Rocket Vision não encontrado. Aplique a migration 0002_blog.");
  const categories = new Map((await db.select().from(schema.blogCategories)).map((c) => [c.slug, c.id]));

  const files = readdirSync(DIR).filter((f) => f.endsWith(".md")).sort();
  for (const file of files) {
    const { meta, body } = splitFrontMatter(readFileSync(path.join(DIR, file), "utf8"));
    const slug = String(meta.slug);
    const [exists] = await db.select({ id: schema.blogArticles.id }).from(schema.blogArticles).where(eq(schema.blogArticles.slug, slug));
    if (exists) {
      console.log(`= ${slug} (já existe)`);
      continue;
    }

    const png = await sharp(Buffer.from(coverSvg(String(meta.cover)))).png().toBuffer();
    const { media } = await uploadMedia(user, { buffer: png, filename: `capa-${slug}.png`, alt: String(meta.coverAlt) }, ctx);

    const parsed = articleInputSchema.parse({
      title: meta.title,
      slug,
      subtitle: meta.subtitle ?? "",
      excerpt: meta.excerpt,
      content: markdownToDocument(body),
      categoryId: categories.get(String(meta.category)) ?? null,
      authorId: redacao.id,
      coverMediaId: media.id,
      coverAlt: meta.coverAlt,
      coverCaption: meta.coverCaption ?? "",
      seoTitle: meta.seoTitle ?? "",
      seoDescription: meta.seoDescription ?? "",
      featured: false,
    });
    const created = await createArticle(user, parsed, ctx);
    await transitionArticle(user, created.id, "submit", { version: created.version }, ctx);

    const checks = Array.isArray(meta.confirm) ? meta.confirm : [];
    await addComment(
      user,
      created.id,
      [
        "Rascunho inicial preparado pela Redação com apoio de IA, a partir das fontes listadas em Referências. Revise antes de publicar.",
        ...(checks.length ? ["Confirmar antes de publicar:", ...checks.map((c) => `• ${c}`)] : []),
      ].join("\n"),
      ctx,
    );
    console.log(`+ ${slug} (${documentStats(parsed.content).words} palavras)`);
  }
}

if (process.argv[1]?.endsWith("seed-blog.mts")) {
  seedBlog()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
