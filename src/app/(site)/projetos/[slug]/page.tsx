import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PreviewBar } from "@/components/layout/preview-bar";
import { Reveal } from "@/components/animations/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { blur, BrowserFrame, PhoneFrame } from "@/components/projects/devices";
import { readableAccent } from "@/lib/projects/color";
import type { PublicProject } from "@/lib/projects/types";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getSectionContent, isPreviewing } from "@/server/content/public";
import { getPublicProject, getPublishedProjects } from "@/server/projects/public";

type Props = { params: Promise<{ slug: string }> };

/** Páginas geradas no build para os projetos publicados; novos projetos são gerados no primeiro acesso. */
export const revalidate = 3600;

export async function generateStaticParams() {
  const projects = await getPublishedProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getPublicProject((await params).slug);
  if (!project) return { title: "Projeto não encontrado", robots: { index: false } };
  const title = project.seoTitle || `${project.name} | Projetos ${site.name}`;
  const description = project.seoDescription || project.summary;
  const image = project.og ?? project.cover;
  const images = image && typeof image.src === "string" ? [{ url: image.src, width: image.width, height: image.height, alt: image.alt }] : undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/projetos/${project.slug}` },
    openGraph: { type: "article", title, description, url: `/projetos/${project.slug}`, ...(images && { images }) },
    twitter: { card: "summary_large_image", title, description, ...(images && { images: images.map((i) => i.url) }) },
    // Projetos conceituais (fictícios) não devem aparecer nos buscadores.
    robots: project.sample ? { index: false, follow: true } : { index: true, follow: true },
  };
}

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const [project, all, projectsPage, settings, previewing] = await Promise.all([
    getPublicProject(slug),
    getPublishedProjects(),
    getSectionContent("projectsPage"),
    getSectionContent("site"),
    isPreviewing(),
  ]);
  if (!project) notFound();

  const light = project.theme.tone === "light";
  // A cor de destaque aparece sobre a cor da marca (categoria) e sobre o papel (destaques).
  const accentOnBrand = readableAccent(project.theme.accent, project.theme.bg);
  const accentOnPaper = readableAccent(project.theme.accent, "#fbfbfd");
  const index = all.findIndex((p) => p.slug === project.slug);
  const next = all.length > 1 ? all[(index + 1) % all.length] : null;
  const hasScreens = Boolean(project.screens.desktop || project.screens.phones.length || project.cover);

  // Só aparecem os blocos com conteúdo: nada de títulos vazios nem resultados inventados.
  const story = [
    { label: "Contexto", text: project.context },
    { label: "Solução", text: project.solution },
    { label: "Resultados", text: project.results },
  ].filter((s) => s.text.trim() !== "");

  const facts = [
    project.client && { label: "Cliente", value: project.client },
    project.year && { label: "Ano", value: project.year },
    { label: "Categoria", value: project.category },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <Header />
      <main id="conteudo">
        {/* Abertura na cor da marca: o único lugar em que a identidade do cliente toma a tela. */}
        <section
          aria-labelledby="projeto-titulo"
          data-header={light ? "dark" : "light"}
          className={cn("relative overflow-hidden", light ? "text-white" : "text-ink")}
          style={{
            backgroundColor: project.theme.bg,
            backgroundImage: `radial-gradient(ellipse 70% 60% at 70% 45%, ${light ? "rgb(255 255 255 / 0.07)" : "rgb(255 255 255 / 0.55)"}, transparent 70%)`,
          }}
        >
          <div className="container-page pt-[calc(var(--header-height)+2.5rem)] pb-14 md:pt-[calc(var(--header-height)+4rem)] md:pb-20">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/projetos"
                className={cn("group inline-flex items-center gap-2 text-sm", light ? "text-white/65 hover:text-white" : "text-black/55 hover:text-ink")}
              >
                <ArrowLeft aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                Projetos
              </Link>
              {project.sample && (
                <span className={cn("rounded-full px-3 py-1.5 font-mono text-[0.6875rem] tracking-wide", light ? "bg-white/10 text-white/80" : "bg-black/[0.06] text-black/60")}>
                  Projeto conceitual
                </span>
              )}
            </div>

            <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <p className={cn("text-eyebrow animate-fade-up", light ? "text-white/60" : "text-black/55")} style={delay(0)}>
                  <span style={{ color: accentOnBrand }}>{project.category}</span>
                  {project.year && (
                    <>
                      <span className="mx-1.5 opacity-40">/</span>
                      {project.year}
                    </>
                  )}
                </p>
                <h1 id="projeto-titulo" className="text-hero mt-5">
                  <span className="block overflow-hidden pb-[0.06em]">
                    <span className="animate-rise block" style={delay(80)}>
                      {project.name}
                    </span>
                  </span>
                </h1>
              </div>
              <div className="animate-fade-up lg:col-span-5" style={delay(300)}>
                {project.logo && (
                  <div className="relative mb-6 h-10 w-40">
                    <Image src={project.logo.src} alt={project.logo.alt} fill sizes="160px" className="object-contain object-left" />
                  </div>
                )}
                <p className={cn("text-lead", light ? "text-white/75" : "text-black/70")}>{project.summary}</p>
                {project.externalUrl && (
                  <a
                    href={project.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("group mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-medium", light ? "text-white" : "text-ink")}
                  >
                    <span className="link-underline">Ver o projeto no ar</span>
                    <ArrowUpRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                )}
              </div>
            </div>

            {hasScreens && (
              <div className="animate-fade-up mt-14 md:mt-20" style={delay(450)}>
                <Stage project={project} />
              </div>
            )}
          </div>
        </section>

        <section className="bg-paper py-20 md:py-28" data-header="light">
          <div className="container-page">
            <dl className="grid grid-cols-2 gap-6 border-b border-line pb-10 md:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-eyebrow text-subtle">{fact.label}</dt>
                  <dd className="mt-2 text-[0.9375rem] text-graphite">{fact.value}</dd>
                </div>
              ))}
              {project.services.length > 0 && (
                <div className="col-span-2 md:col-span-1">
                  <dt className="text-eyebrow text-subtle">Serviços</dt>
                  <dd className="mt-2 text-[0.9375rem] text-graphite">{project.services.join(", ")}</dd>
                </div>
              )}
            </dl>

            {project.description && (
              <Reveal className="mt-16 max-w-4xl md:mt-24">
                <p className="text-[clamp(1.5rem,1rem+1.6vw,2.5rem)] leading-[1.2] font-medium tracking-[-0.03em] whitespace-pre-line text-ink">{project.description}</p>
              </Reveal>
            )}

            {story.length > 0 && (
              <div className="mt-16 md:mt-24">
                {story.map((block) => (
                  <Reveal key={block.label} className="grid gap-4 border-t border-line py-10 lg:grid-cols-12 lg:gap-12 lg:py-14">
                    <h2 className="text-eyebrow text-muted lg:col-span-4">{block.label}</h2>
                    <p className="text-body whitespace-pre-line text-graphite lg:col-span-7">{block.text}</p>
                  </Reveal>
                ))}
              </div>
            )}

            {project.highlights.length > 0 && (
              <Reveal className="mt-16 md:mt-24">
                <Eyebrow>Destaques</Eyebrow>
                <ul className="mt-6 grid gap-x-12 gap-y-4 border-t border-line pt-8 md:grid-cols-2">
                  {project.highlights.map((item, i) => (
                    <li key={i} className="flex gap-3 text-lg tracking-tight text-graphite">
                      <Check aria-hidden="true" className="mt-1 size-5 shrink-0 text-ink" style={{ color: accentOnPaper }} strokeWidth={2.25} />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

            {project.gallery.length > 0 && (
              <div className="mt-16 grid gap-4 md:mt-24 md:grid-cols-2 md:gap-6">
                {project.gallery.map((img, i) => (
                  <Reveal as="figure" key={i} className={cn(project.gallery.length % 2 === 1 && i === 0 && "md:col-span-2")}>
                    <div className="relative overflow-hidden rounded-[1.25rem] bg-mist" style={{ aspectRatio: `${img.width} / ${img.height}` }}>
                      <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        sizes={project.gallery.length % 2 === 1 && i === 0 ? "100vw" : "(min-width: 768px) 50vw, 100vw"}
                        {...blur(img)}
                        className="object-cover"
                      />
                    </div>
                    {img.caption && <figcaption className="mt-3 text-sm text-muted">{img.caption}</figcaption>}
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>

        {next && (
          <section className="bg-paper pb-20 md:pb-28" data-header="light">
            <div className="container-page">
              <Link href={`/projetos/${next.slug}`} className="group flex items-center justify-between gap-6 border-t border-line pt-10">
                <span>
                  <span className="text-eyebrow text-subtle">Próximo projeto</span>
                  <span className="mt-3 flex items-center gap-4">
                    <span aria-hidden="true" className="size-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: next.theme.bg }} />
                    <span className="text-title text-ink transition-transform duration-500 ease-out group-hover:translate-x-1">{next.name}</span>
                  </span>
                </span>
                <ArrowRight aria-hidden="true" className="size-6 shrink-0 text-subtle transition-all duration-500 group-hover:translate-x-1 group-hover:text-ink" />
              </Link>
            </div>
          </section>
        )}

        <section aria-labelledby="projeto-cta" className="bg-mist py-24 md:py-32" data-header="light">
          <div className="container-page grid gap-10 lg:grid-cols-12 lg:items-end">
            <Reveal className="lg:col-span-7">
              <h2 id="projeto-cta" className="text-headline text-ink">
                {projectsPage.cta.title}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9">
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

/** Telas do projeto na abertura: navegador centralizado com o celular à frente, ou celulares lado a lado. */
function Stage({ project }: { project: PublicProject }) {
  const { desktop, phones } = project.screens;
  const main = desktop ?? (phones.length === 0 ? project.cover : null);

  if (main) {
    return (
      <div className="relative mx-auto max-w-5xl pb-[6%]">
        <BrowserFrame screen={main} sizes="(min-width: 1024px) 64rem, 94vw" />
        {phones[0] && (
          <div className="absolute bottom-0 -left-[2%] w-[20%] md:-left-[5%] md:w-[17%]">
            <PhoneFrame screen={phones[0]} sizes="(min-width: 1024px) 11rem, 20vw" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center gap-[6%]">
      {phones.map((screen, i) => (
        <div key={i} className={cn("w-[min(40vw,17rem)]", i === 1 && "mt-[8%]")}>
          <PhoneFrame screen={screen} sizes="(min-width: 1024px) 17rem, 40vw" />
        </div>
      ))}
    </div>
  );
}
