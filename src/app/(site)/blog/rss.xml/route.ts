import { site } from "@/lib/site";
import { getPublishedCards } from "@/server/blog/public";

/** RSS 2.0 com os 30 artigos mais recentes. Só o que está publicado. */
export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET() {
  const cards = (await getPublishedCards()).slice(0, 30);
  const items = cards
    .map((c) => {
      const url = `${site.url}/blog/${c.slug}`;
      return `    <item>
      <title>${esc(c.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <description>${esc(c.excerpt)}</description>
      <category>${esc(c.category.name)}</category>
      <dc:creator>${esc(c.author.name)}</dc:creator>
      <pubDate>${new Date(c.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(`${site.name}: Blog`)}</title>
    <link>${esc(`${site.url}/blog`)}</link>
    <description>Inteligência artificial, cibersegurança e desenvolvimento explicados com clareza.</description>
    <language>pt-BR</language>
    <atom:link href="${esc(`${site.url}/blog/rss.xml`)}" rel="self" type="application/rss+xml" />
${cards[0] ? `    <lastBuildDate>${new Date(cards[0].updatedAt).toUTCString()}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } });
}
