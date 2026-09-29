"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { BrowserFrame, PhoneFrame } from "@/components/projects/devices";
import { projectsShowcase as copy } from "@/content/landing";
import type { ProjectImage, PublicProject as Project } from "@/lib/projects/types";
import { useMediaQuery, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/** Até quantos projetos e quantas telas por projeto entram no tour. */
const MAX_PROJECTS = 4;
const SCREENS_PER_PROJECT = 3;

const pad = (n: number) => String(n).padStart(2, "0");

/** Telas de desktop de um projeto, sem repetir: a capa (ou a tela principal) e as primeiras da galeria. */
function screensOf(project: Project): ProjectImage[] {
  const all = [project.cover ?? project.screens.desktop, ...project.gallery].filter((s): s is ProjectImage => Boolean(s));
  const seen = new Set<string>();
  return all.filter((s) => (seen.has(String(s.src)) ? false : (seen.add(String(s.src)), true))).slice(0, SCREENS_PER_PROJECT);
}

/** Um logo por cliente, na ordem dos projetos. */
function clientLogos(projects: Project[]) {
  const seen = new Set<string>();
  return projects.flatMap((p) => {
    const client = (p.client || p.name).trim();
    if (!p.logo || seen.has(client)) return [];
    seen.add(client);
    return [{ client, logo: p.logo }];
  });
}

/**
 * Projetos reais na home.
 * Desktop: um tour preso ao scroll. A janela do navegador fica parada à direita e as telas de cada
 * projeto passam dentro dela, como se a página estivesse sendo navegada; o celular acompanha com
 * parallax e, à esquerda, a ficha do projeto troca junto.
 * Celular e movimento reduzido: cartões em sequência.
 * Os projetos vêm do CMS (publicados e reais); sem nenhum, a seção não aparece.
 */
export function ProjectsShowcase({ projects: all }: { projects: Project[] }) {
  const reduceMotion = usePrefersReducedMotion();
  const wide = useMediaQuery("(min-width: 1024px)", true);
  const projects = all.filter((p) => screensOf(p).length > 0).slice(0, MAX_PROJECTS);
  if (projects.length === 0) return null;
  const logos = clientLogos(all);

  return (
    <section id="projetos-reais" aria-labelledby="projetos-reais-titulo" className="bg-paper">
      <div className="container-page pt-28 md:pt-36">
        <Reveal className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <h2 id="projetos-reais-titulo" className="text-headline mt-6 text-ink">
              {copy.title}
            </h2>
          </div>
          <p className="text-lead text-muted lg:col-span-4 lg:col-start-9">{copy.lead}</p>
        </Reveal>
      </div>

      {reduceMotion || !wide ? <ProjectCards projects={projects} /> : <ProjectTour projects={projects} />}

      <div className="container-page pb-28 md:pb-36">
        <div className="flex flex-col gap-8 border-t border-line pt-10 md:flex-row md:items-center md:justify-between">
          {logos.length > 0 && (
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-10">
              <p className="text-eyebrow text-muted">{copy.clients}</p>
              <ul className="flex flex-wrap items-center gap-x-10 gap-y-5">
                {logos.map(({ client, logo }) => {
                  // Logos altos (símbolo empilhado) ganham mais altura para ficarem legíveis ao lado dos horizontais.
                  const ratio = logo.width / logo.height;
                  const height = ratio < 1.5 ? 56 : 30;
                  return (
                    <li key={client}>
                      <Image
                        src={logo.src}
                        alt={client}
                        width={Math.round(height * ratio)}
                        height={height}
                        className="object-contain opacity-60 brightness-0"
                        style={{ height, width: "auto" }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <Link href="/projetos" className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink">
            <span className="link-underline">{copy.all}</span>
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProjectInfo({ project, index, total, className }: { project: Project; index: number; total: number; className?: string }) {
  return (
    <div className={className}>
      <p className="text-eyebrow text-muted">
        <span className="text-accent-strong tabular-nums">
          {pad(index + 1)} / {pad(total)}
        </span>
        <span className="mx-2 text-black/20">·</span>
        {project.category}
        {project.year && <span className="text-subtle"> · {project.year}</span>}
      </p>
      <h3 data-name className="mt-5 text-[clamp(2rem,1rem+2.6vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-ink">
        {project.name}
      </h3>
      <p data-fade className="text-body mt-5 max-w-md text-muted">
        {project.summary}
      </p>
      {project.services.length > 0 && (
        <ul data-fade className="mt-6 flex flex-wrap gap-2">
          {project.services.map((service) => (
            <li key={service} className="rounded-full border border-line px-3 py-1 text-[0.8125rem] text-graphite">
              {service}
            </li>
          ))}
        </ul>
      )}
      <Link data-fade href={`/projetos/${project.slug}`} className="group mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink">
        <span className="link-underline">{copy.open}</span>
        <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </div>
  );
}

function ProjectTour({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // Cada passo do tour é uma tela; a ficha e o celular trocam quando muda o projeto.
  const slots = projects.flatMap((project, p) => screensOf(project).map((screen) => ({ project: p, screen })));
  const total = projects.length;

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const frames = q("[data-frame]");
      const infos = q("[data-info]");
      const phones = q("[data-phone]");
      const dots = q("[data-dot]");
      const splits = infos.map((info) => SplitText.create(info.querySelector("[data-name]"), { type: "words", mask: "words" }));

      gsap.set(frames.slice(1), { autoAlpha: 0 });
      gsap.set(infos.slice(1), { autoAlpha: 0 });
      gsap.set(phones.slice(1), { autoAlpha: 0, yPercent: 20 });

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      // A janela inteira sobe devagar durante o tour; o celular sobe mais rápido (profundidade).
      tl.fromTo(q("[data-stage]"), { y: 40 }, { y: -40, ease: "none", duration: slots.length }, 0);
      tl.fromTo(q("[data-phones]"), { y: 120 }, { y: -120, ease: "none", duration: slots.length }, 0);

      slots.forEach((slot, k) => {
        if (k === 0) return;
        const at = k - 0.45;
        tl.to(frames[k - 1], { autoAlpha: 0, scale: 1.04, duration: 0.4 }, at).fromTo(
          frames[k],
          { autoAlpha: 0, y: 48, scale: 0.96 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.45 },
          at,
        );

        const previous = slots[k - 1].project;
        if (slot.project !== previous) {
          const out = infos[previous];
          const next = infos[slot.project];
          tl.to(splits[previous].words, { yPercent: -110, stagger: 0.02, duration: 0.25 }, at)
            .to(out.querySelectorAll("[data-fade]"), { autoAlpha: 0, y: -16, duration: 0.2 }, at)
            .set(out, { autoAlpha: 0 }, at + 0.3)
            .set(next, { autoAlpha: 1 }, at + 0.3)
            .fromTo(splits[slot.project].words, { yPercent: 110 }, { yPercent: 0, stagger: 0.03, duration: 0.3, ease: "power3.out" }, at + 0.3)
            .fromTo(next.querySelectorAll("[data-fade]"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.25 }, at + 0.35)
            .to(phones[previous], { autoAlpha: 0, yPercent: -12, duration: 0.3 }, at)
            .fromTo(phones[slot.project], { autoAlpha: 0, yPercent: 20 }, { autoAlpha: 1, yPercent: 0, duration: 0.4 }, at + 0.2)
            .to(dots, { scaleX: (j: number) => (j === slot.project ? 1 : 0.35), backgroundColor: (j: number) => (j === slot.project ? "#ff5b1f" : "rgba(0,0,0,0.15)"), duration: 0.2 }, at + 0.3);
        }
      });

      return () => splits.forEach((s) => s.revert());
    },
    { scope: ref, dependencies: [slots.length] },
  );

  return (
    <div ref={ref} className="relative mt-10" style={{ height: `${(slots.length + 1) * 75}vh` }}>
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div className="container-page grid w-full grid-cols-12 items-center gap-10">
          <div className="relative col-span-4 min-h-[26rem]">
            {projects.map((project, i) => (
              <div key={project.slug} data-info className="absolute inset-0 flex flex-col justify-center">
                <ProjectInfo project={project} index={i} total={total} />
              </div>
            ))}
            <div className="absolute -bottom-6 left-0 flex gap-2" aria-hidden="true">
              {projects.map((project, i) => (
                <span key={project.slug} data-dot className={cn("h-0.5 w-10 origin-left rounded-full", i === 0 ? "bg-accent" : "scale-x-[0.35] bg-black/15")} />
              ))}
            </div>
          </div>

          <div className="relative col-span-8">
            <div data-stage className="relative aspect-[16/10.6]">
              {slots.map((slot, k) => (
                <div key={k} data-frame className="absolute inset-0">
                  <BrowserFrame screen={slot.screen} sizes="(min-width: 1280px) 58vw, 64vw" />
                </div>
              ))}
            </div>
            <div data-phones className="pointer-events-none absolute -bottom-10 -left-10 w-[21%]">
              {projects.map((project) => (
                <div key={project.slug} data-phone className="absolute bottom-0 left-0 w-full">
                  {project.screens.phones[0] && <PhoneFrame screen={project.screens.phones[0]} sizes="14vw" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCards({ projects }: { projects: Project[] }) {
  return (
    <ul className="container-page mt-14 space-y-20 pb-20 md:mt-20">
      {projects.map((project, i) => {
        const [screen] = screensOf(project);
        return (
          <Reveal as="li" key={project.slug}>
            <Link href={`/projetos/${project.slug}`} className="block" aria-label={`${copy.open}: ${project.name}`} tabIndex={-1}>
              <BrowserFrame screen={screen} sizes="100vw" />
            </Link>
            <ProjectInfo project={project} index={i} total={projects.length} className="mt-8" />
          </Reveal>
        );
      })}
    </ul>
  );
}
