import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getPublishedProjects } from "@/server/projects/public";

/** Revalida junto com os projetos: publicar ou despublicar invalida a tag "projects". */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [{ url: site.url, lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
  const projects = await getPublishedProjects();
  // Projetos de exemplo nunca entram. A página /projetos só entra quando tiver apenas projetos reais.
  const real = projects.filter((p) => !p.sample);
  if (real.length > 0 && real.length === projects.length) {
    pages.push({ url: `${site.url}/projetos`, changeFrequency: "monthly", priority: 0.8 });
  }
  for (const project of real) {
    pages.push({ url: `${site.url}/projetos/${project.slug}`, changeFrequency: "yearly", priority: 0.6 });
  }
  return pages;
}
