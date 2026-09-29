import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArticleCard } from "@/components/blog/article-card";
import { BlogHeader, Pagination } from "@/components/blog/blog-header";
import { JsonLd } from "@/components/blog/json-ld";
import { site } from "@/lib/site";
import { getCategoryBySlug, getPublicCategories, getPublishedCards, paginate } from "@/server/blog/public";
import { getSectionContent } from "@/server/content/public";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) return { title: "Categoria não encontrada", robots: { index: false } };
  const title = `${category.name} | Blog ${site.name}`;
  const description = category.description || `Artigos sobre ${category.name.toLowerCase()} no Blog da ${site.name}.`;
  return { title: { absolute: title }, description, alternates: { canonical: `/blog/categoria/${category.slug}` }, openGraph: { title, description, url: `/blog/categoria/${category.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  // Categoria sem artigo publicado responde 404: nada de páginas vazias indexadas.
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const [cards, categories, settings] = await Promise.all([getPublishedCards(), getPublicCategories(), getSectionContent("site")]);
  const list = cards.filter((c) => c.category.slug === slug);
  const paged = paginate(list, Number(typeof sp.pagina === "string" ? sp.pagina : 1) || 1);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Blog", item: `${site.url}/blog` },
            { "@type": "ListItem", position: 2, name: category.name, item: `${site.url}/blog/categoria/${slug}` },
          ],
        }}
      />
      <Header />
      <main id="conteudo" className="bg-paper pb-24">
        <BlogHeader eyebrow={<>Blog / {category.count} {category.count === 1 ? "artigo" : "artigos"}</>} title={category.name} lead={category.description} categories={categories} current={slug} />
        <div className="container-page">
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {paged.items.map((a) => (
              <ArticleCard key={a.id} article={a} headingLevel={2} />
            ))}
          </div>
          <Pagination page={paged.page} pages={paged.pages} href={(p) => (p === 1 ? `/blog/categoria/${slug}` : `/blog/categoria/${slug}?pagina=${p}`)} />
        </div>
      </main>
      <Footer settings={settings} />
    </>
  );
}
