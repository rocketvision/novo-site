import type { MetadataRoute } from "next";
import { hasSampleProjects } from "@/content/projects";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [{ url: site.url, lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
  // A página de projetos só entra no sitemap quando tiver apenas projetos reais.
  if (!hasSampleProjects) {
    pages.push({ url: `${site.url}/projetos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 });
  }
  return pages;
}
