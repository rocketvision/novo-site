import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SideRail } from "@/components/layout/side-rail";
import { PreviewBar } from "@/components/layout/preview-bar";
import { Reveal } from "@/components/animations/reveal";
import { ServiceHero } from "@/components/sections/service-scenes";
import { servicePageBySlug, servicePageCopy as copy, servicePages } from "@/content/service-pages";
import { toneOf, withExtraServices } from "@/content/landing-scenes";
import { site } from "@/lib/site";
import { realProjects } from "@/lib/projects/service-match";
import { siteTiles, stripsOf } from "@/lib/projects/strips";
import { getSectionContent, isPreviewing } from "@/server/content/public";
import { getPublishedProjects } from "@/server/projects/public";

export const revalidate = 3600;

export function generateStaticParams() {
  return servicePages.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = servicePageBySlug((await params).slug);
  if (!page) return {};
  const services = await getSectionContent("services");
  const service = withExtraServices(services.items).find((s) => s.id === page.service);
  const title = `${page.title} | ${site.name}`;
  const description = service?.what ?? page.whatIs[0];
  const url = `/servicos/${page.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url }, twitter: { title, description } };
}

const BLUE = "#2c9df5";

/**
 * Página de um serviço, aberta pelo "Saiba mais" da cena na home. Abre com a mesma cena animada,
 * presa ao scroll, com o nome do serviço como título; depois o que é, o que muda no negócio, os
 * projetos reais feitos com o serviço, o convite e os outros serviços.
 */
export default async function ServicePage({ params }: Props) {
  const page = servicePageBySlug((await params).slug);
  if (!page) notFound();
  const [services, settings, previewing, published] = await Promise.all([
    getSectionContent("services"),
    getSectionContent("site"),
    isPreviewing(),
    getPublishedProjects(),
  ]);
  const items = withExtraServices(services.items);
  const service = items.find((s) => s.id === page.service);
  if (!service) notFound();

  const all = realProjects(published);
  const projects = page.projects.flatMap((slug) => all.filter((p) => p.slug === slug));
  const others = servicePages.filter((p) => p.slug !== page.slug && items.some((s) => s.id === p.service));
  const whatsapp = settings.contact.whatsapp.replace(/\D/g, "");
  // Com WhatsApp cadastrado, o segundo botão chama direto; sem ele, leva aos planos.
  const talk = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Vim pela página de ${page.title} no site da Rocket Vision e quero saber mais.`)}` : null;

  return (
    <>
      <Header />
      <main id="conteudo" className="bg-[#050507] lg:pl-[var(--rail)]">
        <article className="relative">
          <Link
            href="/#servicos"
            className={`tone-${toneOf(page.service)} absolute top-[calc(var(--header-height)+1rem)] left-[6%] z-20 inline-flex items-center gap-1.5 rounded-full border border-fg/15 bg-tone/40 px-3.5 py-1.5 text-[0.8rem] text-fg/75 backdrop-blur-md transition-colors hover:border-fg/35 hover:text-fg lg:left-12`}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {copy.back}
          </Link>

          <ServiceHero service={service} heading={page.title} tiles={siteTiles(all.map((p) => p.slug))} />

          {/* O que é */}
          <section data-header="dark" className="relative overflow-hidden border-t border-white/[0.08] bg-black text-white">
            <span aria-hidden="true" className="pointer-events-none absolute -top-[6vw] right-[2vw] text-[min(46vw,36rem)] leading-none font-bold tracking-[-0.06em] text-white/[0.03] select-none">
              R
            </span>
            <div className="relative mx-auto grid max-w-[1200px] gap-x-16 gap-y-6 px-[6%] py-24 md:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-32">
              <Reveal as="h2" y={28} className="text-[clamp(2rem,4vw,3.4rem)] leading-[0.96] font-semibold tracking-[-0.04em]">
                {copy.whatIs}
              </Reveal>
              <Reveal y={28} className="space-y-5 text-[1.05rem] leading-relaxed text-pretty text-white/70">
                {page.whatIs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </Reveal>
            </div>
          </section>

          {/* O que muda no negócio: em claro, como capítulo à parte. */}
          <section className="tone-light border-t border-black/[0.06] bg-tone text-fg">
            <div className="mx-auto max-w-[1200px] px-[6%] py-24 lg:px-12 lg:py-32">
              <Reveal as="h2" y={28} className="max-w-[16ch] text-[clamp(2rem,4vw,3.4rem)] leading-[0.96] font-semibold tracking-[-0.04em] text-balance">
                {copy.changes}
              </Reveal>
              <ul className="mt-14 grid border-t border-fg/10 sm:grid-cols-2">
                {page.changes.map((c, i) => (
                  <Reveal as="li" key={c.title} y={28} delay={(i % 2) * 0.08} className="border-b border-fg/10 py-8 sm:odd:border-r sm:odd:pr-10 sm:even:pl-10">
                    <h3 className="flex items-center gap-3 text-[1.08rem] font-medium tracking-tight">
                      <span className="h-px w-5 shrink-0" style={{ background: BLUE }} aria-hidden="true" />
                      {c.title}
                    </h3>
                    <p className="mt-3 max-w-[40ch] text-[0.95rem] leading-relaxed text-pretty text-fg/60">{c.body}</p>
                  </Reveal>
                ))}
              </ul>
            </div>
          </section>

          {/* Feito com esse serviço: projetos reais. */}
          {projects.length > 0 && (
            <section data-header="dark" className="border-t border-white/[0.08] bg-black text-white">
              <div className="mx-auto max-w-[1200px] px-[6%] py-24 lg:px-12 lg:py-32">
                <Reveal as="h2" y={28} className="text-[clamp(2rem,4vw,3.4rem)] leading-[0.96] font-semibold tracking-[-0.04em]">
                  {copy.projects}
                </Reveal>
                <ul className="mt-12 grid gap-4 md:grid-cols-2">
                  {projects.map((project, i) => {
                    const strip = stripsOf(project.slug)?.desktop.src;
                    const cover = project.cover ? (typeof project.cover.src === "string" ? project.cover.src : project.cover.src.src) : null;
                    const image = strip ?? cover;
                    return (
                      <Reveal as="li" key={project.id} y={28} delay={(i % 2) * 0.08}>
                        <Link
                          href={`/projetos/${project.slug}`}
                          className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/25"
                        >
                          <div className="relative aspect-[16/9] overflow-hidden bg-[#0d0e11]">
                            {image && (
                              // eslint-disable-next-line @next/next/no-img-element -- faixa já otimizada, recortada no topo
                              <img src={image} alt={`Site ${project.name}`} loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]" />
                            )}
                          </div>
                          <div className="flex flex-1 flex-col p-6">
                            <p className="font-mono text-[0.7rem] text-white/50">( {copy.client} )</p>
                            <div className="mt-2 flex items-start justify-between gap-4">
                              <h3 className="text-[1.1rem] font-medium tracking-tight">{project.name}</h3>
                              <ArrowUpRight className="size-4 shrink-0 text-white/40 transition-[translate,color] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" aria-hidden="true" />
                            </div>
                            <p className="mt-1 text-[0.85rem] text-white/50">
                              {project.client && project.client !== project.name ? `${project.client} · ` : ""}
                              {project.category}
                            </p>
                          </div>
                        </Link>
                      </Reveal>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {/* Convite e outros serviços. */}
          <section data-header="dark" className="relative overflow-hidden border-t border-white/[0.08] bg-[#09090b] text-white">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgb(44_157_245/0.14),transparent_70%)]" />
            <div className="relative mx-auto max-w-[1200px] px-[6%] py-24 text-center lg:px-12 lg:py-32">
              <Reveal as="h2" y={28} className="mx-auto max-w-[14ch] text-[clamp(2.25rem,5vw,4.2rem)] leading-[0.96] font-semibold tracking-[-0.045em] text-balance">
                {copy.cta.title}
              </Reveal>
              <p className="mx-auto mt-5 max-w-[42ch] text-[1rem] leading-relaxed text-pretty text-white/65">{copy.cta.body}</p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                {/* O diagnóstico (quiz) abre por este link, como em todo o site. */}
                <a
                  href="#diagnostico"
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-[linear-gradient(180deg,#f6f7f9,#bcc1ca)] pr-2 pl-5 text-[0.9375rem] font-semibold text-[#0b0b0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-shadow hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_32px_-8px_rgb(44_157_245/0.7)]"
                >
                  {copy.cta.primary}
                  <span className="grid size-8 place-items-center rounded-full bg-[#0b0b0e] text-white">
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </a>
                {talk ? (
                  <a href={talk} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-5 text-[0.9375rem] font-medium text-white/85 transition-colors hover:border-white/35 hover:text-white">
                    {copy.cta.secondary}
                  </a>
                ) : (
                  <Link href="/#planos" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-5 text-[0.9375rem] font-medium text-white/85 transition-colors hover:border-white/35 hover:text-white">
                    {copy.cta.plans}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </div>

              {others.length > 0 && (
                <div className="mt-20 border-t border-white/10 pt-10">
                  <p className="text-[0.8rem] text-white/45">{copy.others}</p>
                  <ul className="mt-5 flex flex-wrap justify-center gap-2">
                    {others.map((o) => (
                      <li key={o.slug}>
                        <Link href={`/servicos/${o.slug}`} className="inline-flex rounded-full border border-white/12 px-4 py-2 text-[0.85rem] text-white/75 transition-colors hover:border-white/35 hover:text-white">
                          {o.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </article>
      </main>
      <SideRail whatsapp={settings.contact.whatsapp} />
      <div className="lg:pl-[var(--rail)]">
        <Footer settings={settings} />
      </div>
      {previewing && <PreviewBar />}
    </>
  );
}
