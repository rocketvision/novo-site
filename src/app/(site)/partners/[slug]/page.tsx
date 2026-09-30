import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PreviewBar } from "@/components/layout/preview-bar";
import { JsonLd } from "@/components/blog/json-ld";
import { PartnerPage } from "@/components/alliance/partner-page";
import { PROGRAM } from "@/lib/alliance/constants";
import { site } from "@/lib/site";
import { getSectionContent } from "@/server/content/public";
import { getDirectory, getPublicPartner, getPublicProgram, getPublishedPartnerSlugs, isPreviewingAlliance } from "@/server/alliance/public";

/** Páginas estáticas por parceiro, reconstruídas ao publicar (cache por tag). Parceiro novo: gerada no primeiro acesso. */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPublishedPartnerSlugs()).map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const partner = await getPublicPartner((await params).slug);
  if (!partner) return { title: "Parceiro não encontrado", robots: { index: false } };
  const title = partner.seoTitle || `Rocket Vision × ${partner.tradeName}`;
  const description = partner.seoDescription || partner.shortDescription || `${partner.tradeName} é parceira da Rocket Vision no ${PROGRAM.name}.`;
  const url = `/partners/${partner.slug}`;
  const image = partner.og ?? partner.cover;
  return {
    title: { absolute: `${title} | ${PROGRAM.name}` },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", ...(image && { images: [{ url: image.src, width: image.width, height: image.height, alt: image.alt }] }) },
    twitter: { card: "summary_large_image", title, description, ...(image && { images: [image.src] }) },
  };
}

export default async function PartnerRoute({ params }: Props) {
  const { slug } = await params;
  const partner = await getPublicPartner(slug);
  if (!partner) notFound();
  const [settings, program, directory, previewing] = await Promise.all([getSectionContent("site"), getPublicProgram(), getDirectory(), isPreviewingAlliance()]);
  const modalityNames = Object.fromEntries(program.modalities.map((m) => [m.key, m.name]));
  const tierName = partner.tierKey ? (program.tiers.find((t) => t.key === partner.tierKey)?.name ?? null) : null;
  // Outros parceiros: destaques primeiro (a ordem do diretório), até três.
  const others = directory.filter((d) => d.slug !== partner.slug).slice(0, 3);

  const url = `${site.url}/partners/${partner.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}#organization`,
        name: partner.tradeName,
        ...(partner.websiteUrl && { url: partner.websiteUrl }),
        ...(partner.logo && { logo: partner.logo.src.startsWith("http") ? partner.logo.src : `${site.url}${partner.logo.src}` }),
        ...(partner.shortDescription && { description: partner.shortDescription }),
        ...(partner.socialLinks.length > 0 && { sameAs: partner.socialLinks.map((s) => s.url) }),
        ...(partner.location && { address: { "@type": "PostalAddress", addressLocality: partner.location } }),
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: `Rocket Vision × ${partner.tradeName}`,
        about: { "@id": `${url}#organization` },
        isPartOf: { "@type": "WebSite", url: site.url, name: site.name },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: site.name, item: site.url },
          { "@type": "ListItem", position: 2, name: PROGRAM.name, item: `${site.url}/partners` },
          { "@type": "ListItem", position: 3, name: partner.tradeName, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
      <main id="conteudo">
        <PartnerPage partner={partner} modalityNames={modalityNames} tierName={tierName} others={others} />
      </main>
      <Footer settings={settings} />
      {previewing && <PreviewBar />}
    </>
  );
}
