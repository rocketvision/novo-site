import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/animations/reveal";
import { ProjectIndex } from "@/components/projects/project-index";
import { ProjectStack } from "@/components/projects/project-stack";
import { PreviewBar } from "@/components/layout/preview-bar";
import { site } from "@/lib/site";
import { getSectionContent, isPreviewing } from "@/server/content/public";
import { getPublishedProjects } from "@/server/projects/public";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [projectsPage, projects] = await Promise.all([getSectionContent("projectsPage"), getPublishedProjects()]);
  const hasRealProjects = projects.some((p) => !p.sample);
  const title = `Projetos | ${site.name}`;
  const description = projectsPage.lead;
  return {
    title,
    description,
    alternates: { canonical: "/projetos" },
    openGraph: { title, description, url: "/projetos" },
    twitter: { title, description },
    // A página entra nos buscadores quando há ao menos um projeto real. Os conceituais aparecem com selo
    // e cada um fica fora do índice, mas não tiram a página de projetos do ar.
    robots: hasRealProjects ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

export default async function ProjectsPage() {
  const [projectsPage, settings, previewing, projects] = await Promise.all([
    getSectionContent("projectsPage"),
    getSectionContent("site"),
    isPreviewing(),
    getPublishedProjects(),
  ]);
  // O título quebra em duas linhas antes de " que " (a segunda em tom mais claro), quando houver.
  const cut = projectsPage.title.indexOf(" que ");
  const titleLines = cut > 0 ? [projectsPage.title.slice(0, cut), projectsPage.title.slice(cut + 1)] : [projectsPage.title];

  return (
    <>
      <Header />
      <main id="conteudo" className="bg-ink">
        <section
          aria-labelledby="projetos-titulo"
          data-header="dark"
          className="pt-[calc(var(--header-height)+4rem)] pb-16 text-white md:pt-[calc(var(--header-height)+7rem)] md:pb-24"
        >
          <div className="container-page">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <p className="text-eyebrow animate-fade-up text-white/55" style={delay(0)}>
                  {projectsPage.eyebrow} <span className="mx-1.5 text-white/25">/</span>{" "}
                  <span className="tabular-nums">{String(projects.length).padStart(2, "0")}</span>
                </p>
                <h1 id="projetos-titulo" className="text-hero mt-6">
                  <span className="block overflow-hidden pb-[0.06em]">
                    <span className="animate-rise block" style={delay(80)}>
                      {titleLines[0]}
                    </span>
                  </span>
                  {titleLines[1] && (
                    <span className="block overflow-hidden pb-[0.06em]">
                      <span className="animate-rise block text-white/40" style={delay(170)}>
                        {titleLines[1]}
                      </span>
                    </span>
                  )}
                </h1>
              </div>
              <p className="text-lead animate-fade-up text-white/60 lg:col-span-4" style={delay(400)}>
                {projectsPage.lead}
              </p>
            </div>

            <div className="animate-fade-up mt-16 md:mt-24" style={delay(550)}>
              {projects.length > 0 ? (
                <ProjectIndex projects={projects} />
              ) : (
                <p className="border-t border-white/10 pt-8 text-lead text-white/55">Nenhum projeto publicado no momento.</p>
              )}
            </div>
          </div>
        </section>

        {projects.length > 0 && (
          <section aria-label="Projetos em destaque" data-header="dark">
            <ProjectStack projects={projects} />
          </section>
        )}

        <section aria-labelledby="projetos-cta" className="bg-paper py-28 md:py-40">
          <div className="container-page grid gap-10 lg:grid-cols-12 lg:items-end">
            <Reveal className="lg:col-span-8">
              <Eyebrow>Próximo passo</Eyebrow>
              <h2 id="projetos-cta" className="text-display mt-6 text-ink">
                {projectsPage.cta.title}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-4">
              <p className="text-lead text-muted">{projectsPage.cta.body}</p>
              <ButtonLink href="/#contato" size="lg" className="mt-8" icon={<ArrowRight className="size-4" />}>
                {projectsPage.cta.label}
              </ButtonLink>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
      {previewing && <PreviewBar />}
    </>
  );
}
