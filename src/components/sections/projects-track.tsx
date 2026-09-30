"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { projectsTrack as copy } from "@/content/landing-scenes";
import { stripsOf, type Strip } from "@/lib/projects/strips";
import type { PublicProject as Project } from "@/lib/projects/types";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

/** Imagem de um projeto como faixa: a página inteira quando existe, senão a capa. */
function screensOf(project: Project): { desktop: Strip; mobile: Strip } | null {
  const strips = stripsOf(project.slug);
  if (strips) return strips;
  const image = project.cover ?? project.screens.desktop;
  if (!image) return null;
  const src = typeof image.src === "string" ? image.src : image.src.src;
  const phone = project.screens.phones[0];
  const phoneSrc = phone ? (typeof phone.src === "string" ? phone.src : phone.src.src) : src;
  return {
    desktop: { src, width: image.width, height: image.height },
    mobile: phone ? { src: phoneSrc, width: phone.width, height: phone.height } : { src, width: image.width, height: image.height },
  };
}

/**
 * Projetos: um trilho horizontal preso ao scroll. Rolar para baixo leva os projetos para a esquerda
 * e, dentro do notebook e do celular de cada um, o site passa inteiro, de cima a baixo, como se
 * alguém estivesse navegando por ele. Termina num convite: o próximo pode ser o seu.
 * Os projetos vêm do CMS (publicados e reais); sem nenhum, a seção não aparece.
 */
export function ProjectsTrack({ projects: all }: { projects: Project[] }) {
  const ref = useRef<HTMLElement>(null);
  const projects = all.flatMap((project) => {
    const screens = screensOf(project);
    return screens ? [{ project, screens }] : [];
  });

  useGSAP(
    () => {
      const section = ref.current;
      if (!section) return;
      const q = gsap.utils.selector(section);
      const track = q("[data-track]")[0] as HTMLElement;
      // A largura visível é a do palco (a tela menos o trilho lateral, quando ele existe).
      const pin = q("[data-pin]")[0] as HTMLElement;
      const distance = () => Math.max(0, track.scrollWidth - pin.clientWidth);

      // Cada faixa: onde o trilho está quando o site deve estar no topo (x0) e no rodapé (x1).
      type Strip = { el: HTMLElement; travel: number; x0: number; x1: number };
      let strips: Strip[] = [];
      const measure = () => {
        const vw = pin.clientWidth;
        const max = distance();
        strips = q("[data-panel]").flatMap((panel) => {
          const left = panel.offsetLeft;
          // Começa no topo quando o projeto entra pela direita (ou já na abertura, se ele começa visível)
          // e chega ao rodapé quando sai pela esquerda (ou no fim do trilho, se ele não chegar a sair).
          const x0 = Math.min(0, vw * 0.92 - left);
          const x1 = Math.max(-max, vw * 0.3 - (left + panel.offsetWidth));
          return Array.from(panel.querySelectorAll<HTMLElement>("[data-screen]")).flatMap((screen) => {
            const el = screen.querySelector<HTMLElement>("[data-strip]");
            return el ? [{ el, travel: Math.max(0, el.offsetHeight - screen.clientHeight), x0, x1: Math.min(x1, x0 - 1) }] : [];
          });
        });
      };
      const scrollStrips = () => {
        const x = Number(gsap.getProperty(track, "x"));
        for (const s of strips) {
          const k = gsap.utils.clamp(0, 1, (s.x0 - x) / (s.x0 - s.x1));
          s.el.style.transform = `translate3d(0, ${(-k * s.travel).toFixed(1)}px, 0)`;
        }
      };

      // O trilho anda mais devagar que o scroll: dá tempo de ver cada site passar inteiro.
      const length = () => distance() * 1.6;
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        onUpdate: scrollStrips,
        scrollTrigger: {
          trigger: q("[data-pin]")[0],
          pin: true,
          scrub: true,
          start: "top top",
          end: () => `+=${length()}`,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onRefresh: () => {
            measure();
            scrollStrips();
          },
        },
      });

      // A letra ao fundo anda mais devagar que o trilho (profundidade) e a barra marca o progresso.
      const behind = { trigger: q("[data-pin]")[0], start: "top top", end: () => `+=${length()}`, scrub: true, invalidateOnRefresh: true };
      gsap.to(q("[data-letter]"), { xPercent: -45, ease: "none", scrollTrigger: behind });
      gsap.fromTo(q("[data-progress]"), { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { ...behind } });

      // As faixas carregam aos poucos: quando cada uma chega, as medidas mudam.
      const images = Array.from(section.querySelectorAll("img"));
      const refresh = () => ScrollTrigger.refresh();
      images.forEach((img) => img.complete || img.addEventListener("load", refresh, { once: true }));
      return () => images.forEach((img) => img.removeEventListener("load", refresh));
    },
    { scope: ref, dependencies: [projects.length] },
  );

  if (projects.length === 0) return null;

  return (
    <section ref={ref} id="projetos" aria-labelledby="projetos-titulo" data-header="dark" className="relative bg-ink text-white">
      <div data-pin className="relative h-svh overflow-hidden">
        <span
          data-letter
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-[6vw] -translate-y-1/2 text-[min(95svh,60vw)] leading-none font-bold tracking-[-0.06em] text-white/[0.025] select-none"
        >
          R
        </span>

        <div data-track className="relative flex h-full w-max items-center gap-[clamp(3rem,7vw,8rem)] pr-[8vw] pl-[max(1rem,calc((100vw-80rem)/2+3rem))] will-change-transform max-sm:pl-4">
          <div className="w-[min(30rem,84vw)] shrink-0">
            <p className="text-eyebrow text-white/45">{copy.label}</p>
            <h2 id="projetos-titulo" className="mt-6 text-[clamp(2.5rem,1.4rem+3.6vw,4.75rem)] leading-[0.98] font-semibold tracking-[-0.045em]">
              {copy.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="mt-6 max-w-[24rem] text-[0.9375rem] leading-relaxed text-white/55">{copy.lead}</p>
            <p className="mt-8 flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.12em] text-white/40 uppercase">
              <span className="size-1.5 rounded-full bg-white/80" aria-hidden="true" />
              {copy.legend}
            </p>
          </div>

          {projects.map(({ project, screens }, i) => (
            <ProjectPanel key={project.id} project={project} desktop={screens.desktop} mobile={screens.mobile} eager={i === 0} />
          ))}

          <div className="w-[min(22rem,80vw)] shrink-0">
            <p className="text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] leading-[1] font-semibold tracking-[-0.045em]">
              {copy.next.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <Link
              href={copy.next.href}
              className="group mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-white pr-2 pl-5 text-[0.875rem] font-semibold text-ink transition-transform duration-300 hover:-translate-y-0.5"
            >
              {copy.next.cta}
              <span className="grid size-7 place-items-center rounded-full bg-ink text-white">
                <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>

        <div className="container-page absolute inset-x-0 bottom-8" aria-hidden="true">
          <div className="h-px bg-white/10">
            <div data-progress className="h-px origin-left bg-white/60" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectPanel({ project, desktop, mobile, eager }: { project: Project; desktop: Strip; mobile: Strip; eager: boolean }) {
  return (
    <article data-panel aria-labelledby={`projeto-${project.slug}`} className="flex w-[min(66rem,86vw)] shrink-0 flex-col gap-8 md:flex-row md:items-center md:gap-[clamp(2rem,4vw,4rem)]">
      <Devices name={project.name} desktop={desktop} mobile={mobile} eager={eager} />

      <div className="md:w-[19rem] md:shrink-0">
        <p className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.12em] text-white/45 uppercase">
          <span className="size-1.5 rounded-full bg-white/80" aria-hidden="true" />
          {copy.legend}
          {project.year && <span>· {project.year}</span>}
        </p>
        <h3 id={`projeto-${project.slug}`} className="mt-4 text-[clamp(1.625rem,1.2rem+1.2vw,2.25rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
          {project.name}
        </h3>
        <p className="mt-2 text-[0.8125rem] text-white/45">
          {project.client && project.client !== project.name ? `${project.client} · ` : ""}
          {project.category}
        </p>
        <p className="mt-5 text-[0.875rem] leading-relaxed text-white/60 max-md:line-clamp-3">{project.summary}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.8125rem] font-medium">
          {project.externalUrl && (
            <a href={project.externalUrl} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5 text-white">
              <span className="link-underline">{copy.live}</span>
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </a>
          )}
          <Link href={`/projetos/${project.slug}`} className="group inline-flex items-center gap-1.5 text-white/60 hover:text-white">
            <span className="link-underline">{copy.details}</span>
            <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Notebook e celular com a página inteira dentro: a faixa desce com o scroll (ver ProjectsTrack). */
function Devices({ name, desktop, mobile, eager }: { name: string; desktop: Strip; mobile: Strip; eager: boolean }) {
  const loading = eager ? "eager" : "lazy";
  return (
    <div className="relative w-full pr-[9%] pb-[5%] md:flex-1">
      {/* Notebook */}
      <div className="relative">
        <div className="rounded-t-[clamp(8px,1.2vw,16px)] bg-[#17181b] p-[1.4%] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10">
          <div data-screen className="relative aspect-[16/10] overflow-hidden rounded-[3px] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- faixa já otimizada; o tamanho real importa para a rolagem */}
            <img data-strip src={desktop.src} width={desktop.width} height={desktop.height} alt={`${name} no notebook`} loading={loading} decoding="async" className="block h-auto w-full will-change-transform" />
          </div>
        </div>
        <div className="relative mx-[-5%] h-[clamp(8px,1vw,14px)] rounded-b-[clamp(6px,1vw,14px)] bg-[linear-gradient(180deg,#3a3b40,#1c1d20)] shadow-[0_18px_30px_-12px_rgb(0_0_0/0.8)]">
          <div className="absolute top-0 left-1/2 h-[45%] w-[14%] -translate-x-1/2 rounded-b-md bg-black/40" />
        </div>
      </div>

      {/* Celular */}
      <div className="absolute right-0 bottom-0 w-[23%] rounded-[clamp(14px,2.2vw,30px)] bg-[#0c0d0f] p-[1.1%] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.95)] ring-1 ring-white/15">
        <div data-screen className="relative aspect-[9/19.5] overflow-hidden rounded-[clamp(11px,1.8vw,24px)] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- faixa já otimizada; o tamanho real importa para a rolagem */}
          <img data-strip src={mobile.src} width={mobile.width} height={mobile.height} alt={`${name} no celular`} loading={loading} decoding="async" className="block h-auto w-full will-change-transform" />
          <div className="absolute top-[1.2%] left-1/2 h-[2.6%] w-[30%] -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
