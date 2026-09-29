import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArticleCard } from "@/components/blog/article-card";
import { JsonLd } from "@/components/blog/json-ld";
import { authorLabel } from "@/lib/blog/format";
import { site } from "@/lib/site";
import { getPublicAuthor, getPublishedCards } from "@/server/blog/public";
import { getSectionContent } from "@/server/content/public";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const author = await getPublicAuthor((await params).slug);
  if (!author) return { title: "Autor não encontrado", robots: { index: false } };
  const title = `${author.name} | Blog ${site.name}`;
  const description = author.bio.slice(0, 160) || `Artigos de ${author.name} no Blog da ${site.name}.`;
  return { title: { absolute: title }, description, alternates: { canonical: `/blog/autor/${author.slug}` }, openGraph: { type: "profile", title, description, url: `/blog/autor/${author.slug}` } };
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  // Só autores com artigo publicado têm página.
  const author = await getPublicAuthor(slug);
  if (!author) notFound();
  const [cards, settings] = await Promise.all([getPublishedCards(), getSectionContent("site")]);
  const articles = cards.filter((c) => c.author.slug === slug);
  const url = `${site.url}/blog/autor/${slug}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          url,
          mainEntity: {
            "@type": "Person",
            name: author.name,
            ...(author.roleTitle && { jobTitle: author.roleTitle }),
            ...(author.bio && { description: author.bio }),
            ...(author.photo && typeof author.photo.src === "string" && { image: author.photo.src }),
            ...(author.links.length > 0 && { sameAs: author.links.map((l) => l.url) }),
            // Colunista convidado não é apresentado como funcionário da Rocket Vision.
            ...(author.affiliation === "team" && { worksFor: { "@type": "Organization", "@id": `${site.url}/#organization`, name: site.name } }),
          },
        }}
      />
      <Header />
      <main id="conteudo" className="bg-paper pb-24">
        <header className="container-page pt-[calc(var(--header-height)+3rem)] md:pt-[calc(var(--header-height)+5rem)]">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-ink">
            <ArrowLeft aria-hidden="true" className="size-3.5" /> Blog
          </Link>
          <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-center">
            {author.photo && (
              <div className="relative size-28 shrink-0 overflow-hidden rounded-full bg-mist md:size-36">
                <Image src={author.photo.src} alt={`Foto de ${author.name}`} fill priority sizes="144px" className="object-cover" />
              </div>
            )}
            <div className="max-w-2xl">
              <p className="text-eyebrow text-muted">{authorLabel(author)}</p>
              <h1 className="text-hero mt-4">{author.name}</h1>
              {author.bio && <p className="text-lead mt-5 text-muted">{author.bio}</p>}
              {author.links.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {author.links.map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer me" className="inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-sm text-graphite ring-1 ring-inset ring-black/10 hover:bg-mist">
                        {l.label} <ArrowUpRight aria-hidden="true" className="size-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </header>
        <section aria-labelledby="artigos" className="container-page mt-16 border-t border-line pt-14">
          <h2 id="artigos" className="text-eyebrow text-muted">
            {articles.length} {articles.length === 1 ? "artigo" : "artigos"}
          </h2>
          <div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}
