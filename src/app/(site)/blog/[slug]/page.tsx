import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PreviewBar } from "@/components/layout/preview-bar";
import { ArticleBody } from "@/components/blog/article-body";
import { ArticleCard } from "@/components/blog/article-card";
import { BlogCta } from "@/components/blog/blog-cta";
import { JsonLd } from "@/components/blog/json-ld";
import { ShareLinks } from "@/components/blog/share-links";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { blur } from "@/components/projects/devices";
import { authorLabel, formatArticleDate, wasUpdated } from "@/lib/blog/format";
import { site } from "@/lib/site";
import { getPublicArticle, getPublishedCards, getRelatedArticles } from "@/server/blog/public";
import { getSectionContent } from "@/server/content/public";

type Props = { params: Promise<{ slug: string }> };

/** Páginas geradas no build para os artigos publicados; novos artigos são gerados no primeiro acesso. */
export const revalidate = 3600;

export async function generateStaticParams() {
  const cards = await getPublishedCards();
  return cards.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getPublicArticle((await params).slug);
  if (!article) return { title: "Artigo não encontrado", robots: { index: false } };
  const title = article.seoTitle || `${article.title} | Blog ${site.name}`;
  const description = article.seoDescription || article.excerpt;
  const image = article.cover && typeof article.cover.src === "string" ? [{ url: article.cover.src, width: article.cover.width, height: article.cover.height, alt: article.cover.alt }] : undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/blog/${article.slug}`, types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: `${site.name}: Blog` }] } },
    authors: [{ name: article.author.name, url: article.author.slug ? `${site.url}/blog/autor/${article.author.slug}` : undefined }],
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${article.slug}`,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author.name],
      section: article.category.name,
      ...(image && { images: image }),
    },
    twitter: { card: "summary_large_image", title, description, ...(image && { images: image.map((i) => i.url) }) },
    robots: article.preview ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublicArticle(slug);
  if (!article) notFound();
  const [related, settings] = await Promise.all([getRelatedArticles(article), getSectionContent("site")]);
  const url = `${site.url}/blog/${article.slug}`;
  const updated = wasUpdated(article);
  const authorUrl = article.author.slug ? `${site.url}/blog/autor/${article.author.slug}` : undefined;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BlogPosting",
              "@id": `${url}#article`,
              headline: article.title,
              description: article.seoDescription || article.excerpt,
              ...(article.cover && typeof article.cover.src === "string" && { image: [article.cover.src] }),
              datePublished: article.publishedAt,
              dateModified: article.updatedAt,
              inLanguage: "pt-BR",
              articleSection: article.category.name,
              mainEntityOfPage: url,
              url,
              author: { "@type": "Person", name: article.author.name, ...(authorUrl && { url: authorUrl }), ...(article.author.roleTitle && { jobTitle: article.author.roleTitle }) },
              publisher: { "@type": "Organization", "@id": `${site.url}/#organization`, name: site.name, url: site.url },
              isPartOf: { "@id": `${site.url}/blog#blog` },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Início", item: site.url },
                { "@type": "ListItem", position: 2, name: "Blog", item: `${site.url}/blog` },
                { "@type": "ListItem", position: 3, name: article.category.name, item: `${site.url}/blog/categoria/${article.category.slug}` },
                { "@type": "ListItem", position: 4, name: article.title, item: url },
              ],
            },
          ],
        }}
      />
      <Header />
      <main id="conteudo" className="bg-paper">
        <article>
          <header className="container-page pt-[calc(var(--header-height)+2.5rem)] md:pt-[calc(var(--header-height)+4rem)]">
            <nav aria-label="Trilha de navegação" className="text-sm text-subtle">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <li>
                  <Link href="/blog" className="inline-flex items-center gap-1.5 hover:text-ink">
                    <ArrowLeft aria-hidden="true" className="size-3.5" /> Blog
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={`/blog/categoria/${article.category.slug}`} className="hover:text-ink">
                    {article.category.name}
                  </Link>
                </li>
              </ol>
            </nav>

            <div className="mx-auto mt-12 max-w-3xl text-center">
              <p className="text-eyebrow text-accent-strong">{article.category.name}</p>
              <h1 className="mt-5 font-serif text-[clamp(2.4rem,5.2vw,4.4rem)] leading-[1.04] tracking-[-0.01em] text-ink text-balance">{article.title}</h1>
              {article.subtitle && <p className="text-lead mx-auto mt-6 max-w-2xl text-muted text-pretty">{article.subtitle}</p>}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-subtle">
                <AuthorChip article={article} />
                <span aria-hidden="true">·</span>
                <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
                {updated && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Atualizado em <time dateTime={article.updatedAt}>{formatArticleDate(article.updatedAt)}</time>
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{article.readingMinutes} min de leitura</span>
              </div>
            </div>
          </header>

          {article.cover && (
            <figure className="container-page mt-12 md:mt-16">
              <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-mist">
                <Image src={article.cover.src} alt={article.cover.alt} fill priority sizes="(min-width: 1400px) 1300px, 100vw" {...blur(article.cover)} className="object-cover" />
              </div>
              {article.coverCaption && <figcaption className="mt-3 text-center text-sm text-subtle">{article.coverCaption}</figcaption>}
            </figure>
          )}

          <div className="container-page mt-14 grid gap-12 pb-20 lg:grid-cols-[1fr_minmax(0,44rem)_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-[calc(var(--header-height)+2rem)]">
                <TableOfContents entries={article.toc} />
              </div>
            </aside>
            <div className="min-w-0">
              <ArticleBody document={article.content} media={article.media} />
              <div className="mt-14 border-t border-line pt-8">
                <ShareLinks url={url} title={article.title} />
              </div>
              <AuthorBox article={article} />
            </div>
          </div>
        </article>

        <div className="container-page pb-20">
          <BlogCta category={article.category.slug} />
        </div>

        {related.length > 0 && (
          <section aria-labelledby="relacionados" className="border-t border-line bg-white py-20">
            <div className="container-page">
              <h2 id="relacionados" className="text-title">
                Continue lendo
              </h2>
              <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer settings={settings} />
      {article.preview && <PreviewBar />}
    </>
  );
}

type ArticleProp = { article: NonNullable<Awaited<ReturnType<typeof getPublicArticle>>> };

function AuthorChip({ article }: ArticleProp) {
  const { author } = article;
  const content = (
    <span className="inline-flex items-center gap-2">
      {author.photo && (
        <span className="relative size-7 overflow-hidden rounded-full bg-mist">
          <Image src={author.photo.src} alt="" fill sizes="28px" className="object-cover" />
        </span>
      )}
      <span className="font-medium text-graphite">{author.name}</span>
      {author.affiliation === "guest" && <span className="rounded-full bg-mist px-2 py-0.5 text-xs text-muted">Colunista convidado</span>}
    </span>
  );
  return author.slug ? (
    <Link href={`/blog/autor/${author.slug}`} className="hover:text-ink">
      {content}
    </Link>
  ) : (
    content
  );
}

function AuthorBox({ article }: ArticleProp) {
  const { author } = article;
  if (!author.bio && !author.photo) return null;
  return (
    <section aria-label="Sobre o autor" className="mt-12 flex gap-5 rounded-2xl bg-mist p-6">
      {author.photo && (
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-white">
          <Image src={author.photo.src} alt={`Foto de ${author.name}`} fill sizes="64px" className="object-cover" />
        </div>
      )}
      <div>
        <p className="font-semibold text-ink">
          {author.slug ? (
            <Link href={`/blog/autor/${author.slug}`} className="hover:underline">
              {author.name}
            </Link>
          ) : (
            author.name
          )}
        </p>
        <p className="text-sm text-subtle">{authorLabel(author)}</p>
        {author.bio && <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{author.bio}</p>}
      </div>
    </section>
  );
}
