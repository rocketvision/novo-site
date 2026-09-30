import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroScene } from "@/components/sections/hero-scene";
import { SideRail } from "@/components/layout/side-rail";
import { ProjectsTrack } from "@/components/sections/projects-track";
import { ServiceScenes, type SiteTile } from "@/components/sections/service-scenes";
import { Promises } from "@/components/sections/promises";
import { Plans } from "@/components/sections/plans";
import { FinalCta } from "@/components/sections/final-cta";
import type { Metadata } from "next";
import { PreviewBar } from "@/components/layout/preview-bar";
import { site } from "@/lib/site";
import { getLandingContent, getSectionContent, isPreviewing } from "@/server/content/public";
import { getPublishedProjects } from "@/server/projects/public";
import { realProjects } from "@/lib/projects/service-match";
import { stripsOf } from "@/lib/projects/strips";

/**
 * Página estática, reconstruída só quando uma seção é publicada (cache por tag).
 * O intervalo abaixo é só uma rede de segurança caso uma geração tenha caído no conteúdo embutido.
 */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSectionContent("site");
  return {
    title: { absolute: seo.title },
    description: seo.description,
    openGraph: { title: seo.title, description: seo.description, url: "/" },
    twitter: { title: seo.title, description: seo.description },
  };
}

/** Recortes de páginas reais para o mosaico da cena de sites: vários trechos de cada página inteira. */
function siteTiles(projects: ReturnType<typeof realProjects>): SiteTile[] {
  const strips = projects.flatMap((p) => {
    const s = stripsOf(p.slug);
    return s ? [s.desktop.src] : [];
  });
  const positions = ["50% 0%", "50% 35%", "50% 70%", "50% 100%"];
  return positions.flatMap((position) => strips.map((src) => ({ src, position })));
}

/**
 * A promessa sobre o vídeo de abertura; depois, em cenas presas ao scroll: projetos reais rodando
 * dentro de notebook e celular, cada serviço funcionando, as duas letras da marca, os planos e a conversa.
 */
export default async function Home() {
  const [content, previewing, published] = await Promise.all([getLandingContent(), isPreviewing(), getPublishedProjects()]);
  // Só projetos reais (os de exemplo nunca vão para a landing), na ordem do CMS: destacados primeiro.
  const projects = realProjects(published);
  const settings = content.site;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.name,
        slogan: site.slogan,
        url: site.url,
        description: settings.seo.description,
        ...(settings.contact.email && { email: settings.contact.email }),
        ...(settings.contact.phone && { telephone: settings.contact.phone }),
        ...(settings.social.length > 0 && { sameAs: settings.social.map((s) => s.href) }),
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        inLanguage: "pt-BR",
        publisher: { "@id": `${site.url}/#organization` },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Header />
      <main id="conteudo">
        <HeroScene hero={content.hero} services={content.services} />
        <ProjectsTrack projects={projects} />
        <ServiceScenes services={content.services} tiles={siteTiles(projects)} />
        <Promises />
        <Plans />
        <FinalCta cta={content.cta} contact={settings.contact} />
      </main>
      <SideRail />
      <Footer settings={settings} />
      {previewing && <PreviewBar />}
    </>
  );
}
