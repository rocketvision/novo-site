import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getPublishedProjects } from "@/server/projects/public";
import { getBlogSitemapEntries } from "@/server/blog/public";
import { servicePages } from "@/content/service-pages";

/** Revalida junto com os projetos e o Blog: publicar ou despublicar invalida as tags "projects" e "blog". */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [{ url: site.url, lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
  // Páginas de cada serviço, abertas pelo "Saiba mais" das cenas da home.
  for (const page of servicePages) pages.push({ url: `${site.url}/servicos/${page.slug}`, changeFrequency: "monthly", priority: 0.7 });
  const projects = await getPublishedProjects();
  // Projetos de exemplo nunca entram. A página /projetos só entra quando tiver apenas projetos reais.
  const real = projects.filter((p) => !p.sample);
  if (real.length > 0 && real.length === projects.length) {
    pages.push({ url: `${site.url}/projetos`, changeFrequency: "monthly", priority: 0.8 });
  }
  for (const project of real) {
    pages.push({ url: `${site.url}/projetos/${project.slug}`, changeFrequency: "yearly", priority: 0.6 });
  }
  // Blog: só o que está publicado. Rascunhos, revisões e agendados nunca entram.
  const blog = await getBlogSitemapEntries();
  if (blog.cards.length > 0) {
    pages.push({ url: `${site.url}/blog`, lastModified: new Date(blog.cards[0].updatedAt), changeFrequency: "weekly", priority: 0.8 });
    for (const c of blog.cards) pages.push({ url: `${site.url}/blog/${c.slug}`, lastModified: new Date(c.updatedAt), changeFrequency: "monthly", priority: 0.7 });
    for (const c of blog.categories) pages.push({ url: `${site.url}/blog/categoria/${c.slug}`, changeFrequency: "weekly", priority: 0.5 });
    for (const a of blog.authors) pages.push({ url: `${site.url}/blog/autor/${a.author.slug}`, changeFrequency: "monthly", priority: 0.4 });
  }
  return pages;
}
