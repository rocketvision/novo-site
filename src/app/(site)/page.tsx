import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroScene } from "@/components/sections/hero-scene";
import { Services } from "@/components/sections/services";
import { ProjectsShowcase } from "@/components/sections/projects-showcase";
import { Process } from "@/components/sections/process";
import { FinalCta } from "@/components/sections/final-cta";
import type { Metadata } from "next";
import { PreviewBar } from "@/components/layout/preview-bar";
import { site } from "@/lib/site";
import { getLandingContent, getSectionContent, isPreviewing } from "@/server/content/public";
import { getPublishedProjects } from "@/server/projects/public";
import { realProjects } from "@/lib/projects/service-match";

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

/**
 * Só o que importa: a promessa sobre o vídeo de abertura, o que a Rocket constrói,
 * projetos reais, como trabalhamos e a conversa.
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
        <HeroScene hero={content.hero} services={content.services} projects={projects} />
        <Services services={content.services} problem={content.problem} projects={projects} />
        <ProjectsShowcase projects={projects} />
        <Process workflow={content.workflow} />
        <FinalCta cta={content.cta} contact={settings.contact} />
      </main>
      <Footer settings={settings} />
      {previewing && <PreviewBar />}
    </>
  );
}
