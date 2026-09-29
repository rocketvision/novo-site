import type { Metadata } from "next";
import { headers } from "next/headers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArticleCard } from "@/components/blog/article-card";
import { BlogHeader, Pagination } from "@/components/blog/blog-header";
import { JsonLd } from "@/components/blog/json-ld";
import { site } from "@/lib/site";
import { clientIpFrom } from "@/server/auth/session";
import { getPublicCategories, getPublishedCards, paginate, searchArticles } from "@/server/blog/public";
import { getSectionContent } from "@/server/content/public";
import { consume, POLICIES } from "@/server/security/rate-limit";

const TITLE = "Blog";
const HEADLINE = "Tecnologia com contexto.";
const LEAD = "Inteligência artificial, cibersegurança e desenvolvimento explicados com clareza, para quem decide e para quem constrói.";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function readParams(sp: Awaited<Props["searchParams"]>) {
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const page = Math.max(1, Math.min(500, Number(typeof sp.pagina === "string" ? sp.pagina : 1) || 1));
  return { q, page };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, page } = readParams(await searchParams);
  const cards = await getPublishedCards();
  const title = `${TITLE} | ${site.name}`;
  return {
    title: { absolute: title },
    description: LEAD,
    alternates: { canonical: page > 1 ? `/blog?pagina=${page}` : "/blog", types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: `${site.name}: Blog` }] } },
    openGraph: { title, description: LEAD, url: "/blog" },
    twitter: { card: "summary_large_image", title, description: LEAD },
    // Busca e Blog ainda vazio não são indexados.
    robots: q || cards.length === 0 ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function BlogPage({ searchParams }: Props) {
  const { q, page } = readParams(await searchParams);
  const [cards, categories, settings] = await Promise.all([getPublishedCards(), getPublicCategories().catch(() => []), getSectionContent("site")]);

  let results: typeof cards | null = null;
  let limited = false;
  if (q.length >= 2) {
    const ip = clientIpFrom(await headers()) ?? "unknown";
    const rl = await consume(POLICIES.blogSearchByIp, ip);
    if (rl.allowed) results = await searchArticles(q).catch(() => []);
    else limited = true;
  }

  const lead = cards.find((c) => c.featured) ?? cards[0];
  const featured = cards.filter((c) => c.featured && c.id !== lead?.id).slice(0, 3);
  const rest = cards.filter((c) => c.id !== lead?.id && !featured.some((f) => f.id === c.id));
  const paged = paginate(rest, page);
  const firstPage = paged.page === 1;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "@id": `${site.url}/blog#blog`,
          name: `${site.name}: Blog`,
          url: `${site.url}/blog`,
          inLanguage: "pt-BR",
          publisher: { "@type": "Organization", "@id": `${site.url}/#organization`, name: site.name, url: site.url },
        }}
      />
      <Header />
      <main id="conteudo" className="bg-paper pb-24">
        <BlogHeader eyebrow="Rocket Vision / Blog" title={HEADLINE} lead={LEAD} categories={categories} query={q} />

        <div className="container-page">
          {q ? (
            <section aria-labelledby="resultados">
              <h2 id="resultados" className="text-title">
                {limited ? "Muitas buscas seguidas" : `Resultados para "${q}"`}
              </h2>
              {limited ? (
                <p className="mt-4 text-muted">Aguarde um minuto e tente de novo.</p>
              ) : results && results.length > 0 ? (
                <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-muted">Nenhum artigo encontrado. Tente outras palavras.</p>
              )}
            </section>
          ) : cards.length === 0 ? (
            <p className="text-lead max-w-xl text-muted">Os primeiros artigos estão em revisão e chegam em breve.</p>
          ) : (
            <>
              {firstPage && lead && (
                <section aria-label="Destaque">
                  <ArticleCard article={lead} size="lead" headingLevel={2} priority />
                </section>
              )}
              {firstPage && featured.length > 0 && (
                <section aria-labelledby="em-destaque" className="mt-20">
                  <h2 id="em-destaque" className="text-eyebrow text-muted">
                    Em destaque
                  </h2>
                  <div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                    {featured.map((a) => (
                      <ArticleCard key={a.id} article={a} />
                    ))}
                  </div>
                </section>
              )}
              {paged.items.length > 0 && (
                <section aria-labelledby="recentes" className={firstPage ? "mt-20 border-t border-line pt-14" : ""}>
                  <h2 id="recentes" className="text-eyebrow text-muted">
                    {firstPage ? "Recentes" : `Página ${paged.page}`}
                  </h2>
                  <div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                    {paged.items.map((a) => (
                      <ArticleCard key={a.id} article={a} />
                    ))}
                  </div>
                  <Pagination page={paged.page} pages={paged.pages} href={(p) => (p === 1 ? "/blog" : `/blog?pagina=${p}`)} />
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer settings={settings} />
    </>
  );
}
