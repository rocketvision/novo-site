import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/animations/reveal";
import { ProjectIndex } from "@/components/projects/project-index";
import { ProjectStack } from "@/components/projects/project-stack";
import { hasSampleProjects, projects, projectsPage } from "@/content/projects";
import { site } from "@/lib/site";

const title = `Projetos | ${site.name}`;
const description = projectsPage.lead;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/projetos" },
  openGraph: { title, description, url: "/projetos" },
  twitter: { title, description },
  // Enquanto houver projetos de exemplo, a página não deve aparecer nos buscadores.
  robots: hasSampleProjects ? { index: false, follow: true } : { index: true, follow: true },
};

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

export default function ProjectsPage() {
  const titleLines = projectsPage.title.split(" que ");

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
                  <span className="block overflow-hidden pb-[0.06em]">
                    <span className="animate-rise block text-white/40" style={delay(170)}>
                      que {titleLines[1]}
                    </span>
                  </span>
                </h1>
              </div>
              <p className="text-lead animate-fade-up text-white/60 lg:col-span-4" style={delay(400)}>
                {projectsPage.lead}
              </p>
            </div>

            <div className="animate-fade-up mt-16 md:mt-24" style={delay(550)}>
              <ProjectIndex projects={projects} />
            </div>
          </div>
        </section>

        <section aria-label="Projetos em destaque" data-header="dark">
          <ProjectStack projects={projects} />
        </section>

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
      <Footer />
    </>
  );
}
