"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cubicBezier, m, useTransform, type MotionValue } from "motion/react";
import { ArrowDown, ArrowRight, Globe, LayoutDashboard, PenTool, ShoppingBag, Smartphone, Sparkle } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import type { Resolved } from "@/lib/content/resolved";
import { useMediaQuery, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;
const easeInOut = cubicBezier(...ease.inOut);

type Content = {
  hero: Resolved<"hero">;
  problem: Resolved<"problem">;
  services: Resolved<"services">;
  workflow: Resolved<"workflow">;
};

/** Momentos da cena, em progresso do scroll (0 a 1). */
const T = {
  textOut: [0.02, 0.16],
  shrink: [0.04, 0.34],
  dim: [0.12, 0.34],
  manifestIn: [0.22, 0.3],
  words: [0.28, 0.82],
  fade: [0.92, 1],
} as const;

/** Ícone de traço para cada serviço, pelo identificador. */
const SERVICE_ICONS: Record<string, typeof Globe> = {
  sites: Globe,
  lojas: ShoppingBag,
  "lojas-virtuais": ShoppingBag,
  sistemas: LayoutDashboard,
  aplicativos: Smartphone,
  apps: Smartphone,
  identidade: PenTool,
  "identidade-visual": PenTool,
};

/** Altura das barras do painel fantasma: uma por etapa, subindo como uma escada. */
const stepHeight = (i: number, total: number) => 30 + (58 * (i + 1)) / total;

/**
 * Abertura.
 *
 * 1. A promessa sobre o vídeo em brasa: o título com uma única palavra em serifa itálica,
 *    o convite, a garantia e os compromissos em cartões de vidro. Tudo entra em cascata.
 * 2. Com o scroll, o vídeo recua até virar uma janela com cantos arredondados e escurece,
 *    como numa página de produto da Apple.
 * 3. Por cima dele, o manifesto do problema acende palavra por palavra e termina em
 *    "Sua empresa cresceu. As ferramentas dela, não."
 */
export function HeroScene(content: Content) {
  const reduceMotion = usePrefersReducedMotion();
  return reduceMotion ? <StaticHero {...content} /> : <AnimatedHero {...content} />;
}

/** "muda o *rumo*": o trecho entre asteriscos vira a palavra em serifa itálica. */
function TitleLine({ line }: { line: string }) {
  return line.split(/(\*[^*]+\*)/).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
      <em key={i} className="font-serif font-normal tracking-[-0.01em] italic">
        {part.slice(1, -1)}
      </em>
    ) : (
      part
    ),
  );
}

/** Vídeo em loop, servido pelo próprio site. Aparece suavemente quando pode tocar. */
function HeroVideo({ play }: { play: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!play) {
      video.pause();
      return;
    }
    // Alguns navegadores só iniciam o autoplay com um empurrão explícito.
    video.play().catch(() => {});
  }, [play]);

  return (
    <video
      ref={ref}
      className={cn(
        "absolute inset-0 size-full object-cover object-[68%_center] transition-[opacity,scale] duration-[1100ms,2400ms] ease-out",
        ready || !play ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
      )}
      src="/hero-loop.mp4"
      poster="/hero-poster.jpg"
      autoPlay={play}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      onCanPlay={() => setReady(true)}
    />
  );
}

/** Fundo da abertura: brasa, vídeo, a máscara que protege a leitura e as linhas finas. */
function HeroMedia({ play }: { play: boolean }) {
  return (
    // O primeiro quadro fica por baixo: aparece antes do vídeo carregar e onde ele não toca.
    <div
      className="absolute inset-0 bg-ember-deep bg-[url(/hero-poster.jpg)] bg-cover bg-[68%_center]"
      aria-hidden="true"
    >
      <HeroVideo play={play} />
      {/* O vídeo é laranja do horizonte para a direita e quase preto no alto à esquerda:
          a máscara é assimétrica, pesada sob o texto e quase nula sobre o personagem. */}
      <div className="absolute inset-0 bg-[linear-gradient(96deg,rgb(10_3_0/0.9)_0%,rgb(14_4_0/0.7)_34%,rgb(20_6_0/0.2)_56%,rgb(20_6_0/0)_72%),linear-gradient(0deg,rgb(9_2_0/0.78)_0%,rgb(9_2_0/0.12)_28%,transparent_46%),linear-gradient(180deg,rgb(8_2_0/0.5)_0%,transparent_22%)] max-md:bg-[linear-gradient(180deg,rgb(8_2_0/0.55)_0%,rgb(10_3_0/0.35)_30%,rgb(10_3_0/0.78)_62%,rgb(9_2_0/0.92)_100%)]" />
      <div className="absolute inset-0 hidden justify-between px-[30%] md:flex">
        <span className="w-px bg-white/[0.055]" />
        <span className="ml-3.5 w-px bg-white/[0.055]" />
        <span className="w-px bg-white/[0.055]" />
      </div>
    </div>
  );
}

function HeroContent({ hero, services, workflow }: Omit<Content, "problem">) {
  return (
    <div className="container-page relative flex min-h-svh flex-col pt-[calc(var(--header-height)+2rem)] pb-6 md:pt-[calc(var(--header-height)+0.75rem)]">
      <div className="grid flex-1 content-center gap-10 min-[1120px]:grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)] min-[1120px]:items-start">
        <div className="max-w-[820px]">
          <p
            className="animate-fade-up flex w-fit max-w-[300px] items-center gap-2.5 border-t border-white/[0.08] pt-3 text-[11.5px] leading-[1.45] text-white/50"
            style={delay(0)}
          >
            <LogoMark className="size-5 flex-none text-accent" />
            <span>{hero.eyebrow}</span>
          </p>

          <h1 className="mt-5 text-[clamp(2.6rem,min(5.2vw,10svh),5.5rem)] leading-[0.92] font-semibold tracking-[-0.035em] text-white [text-shadow:0_6px_40px_rgb(0_0_0/0.45)] max-sm:tracking-[-0.03em]">
            {hero.titleLines.map((line, i) => (
              <span key={i} className="block overflow-hidden pb-[0.08em]">
                <span className="animate-rise block sm:whitespace-nowrap" style={delay(60 + i * 80)}>
                  <TitleLine line={line} />
                </span>
              </span>
            ))}
          </h1>

          <p className="animate-fade-up mt-5 max-w-[410px] text-[15px] leading-[1.58] text-white/72" style={delay(300)}>
            {hero.lead}
          </p>

          <div className="animate-fade-up mt-7 flex flex-wrap items-center gap-5" style={delay(380)}>
            <Link
              href={hero.primaryCta.href}
              className="group inline-flex items-center gap-2.5 rounded-full bg-[linear-gradient(96deg,var(--color-accent)_0%,var(--color-accent-soft)_100%)] py-1.5 pr-1.5 pl-6 text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap text-white shadow-[0_14px_40px_rgb(255_91_31/0.38)] transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgb(255_91_31/0.5)]"
            >
              {hero.primaryCta.label}
              <span className="grid size-[2.55em] place-items-center rounded-full bg-white text-ink" aria-hidden="true">
                <ArrowRight className="size-[1.15em] transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </Link>

            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full border-2 border-[rgb(22_7_0/0.85)] bg-[linear-gradient(140deg,var(--color-accent),var(--color-accent-soft))] text-white" aria-hidden="true">
                <LogoMark className="size-5" />
              </span>
              <span className="grid text-[11px] leading-[1.4] text-white/50">
                <strong className="text-[12.5px] font-medium text-white/90">{hero.proof.title}</strong>
                {hero.proof.text}
              </span>
            </div>
          </div>

          <ul className="animate-fade-up mt-7 flex flex-wrap gap-3.5" style={delay(460)}>
            {hero.highlights.map((item, i) => (
              <li
                key={i}
                className={cn(
                  "relative grid min-h-[118px] w-[220px] content-between gap-4 rounded-2xl border border-white/14 p-[18px] shadow-[inset_0_1px_0_rgb(255_255_255/0.09)] backdrop-blur-[16px] backdrop-saturate-[1.1] max-sm:w-auto max-sm:flex-[1_1_140px]",
                  i === 1 ? "bg-[linear-gradient(150deg,rgb(120_30_4/0.5),rgb(48_14_2/0.5))]" : "bg-[rgb(56_20_6/0.42)]",
                )}
              >
                <span className="absolute top-3.5 right-4 text-[15px] text-white/45" aria-hidden="true">
                  *
                </span>
                <span className="pr-4 text-[clamp(1.5rem,1.9vw,1.85rem)] leading-none font-medium tracking-[-0.03em] text-white">{item.value}</span>
                <span className="pr-6 text-[11.5px] leading-snug text-white/50">{item.label}</span>
                <span className="absolute right-4 bottom-[22px] h-px w-3.5 bg-white/28" aria-hidden="true" />
              </li>
            ))}
          </ul>
        </div>

        {/* Painel fantasma: o caminho de trabalho como textura, quase ilegível de propósito. */}
        <aside className="animate-fade-up mt-10 hidden max-w-[330px] self-start justify-self-end text-white/26 min-[1120px]:block" style={delay(540)} aria-hidden="true">
          <div className="flex items-end gap-[18px]">
            <div className="flex h-[74px] items-end gap-[5px]">
              {workflow.steps.map((_, i) => (
                <span key={i} className="w-[9px] rounded-t-[2px] bg-white/50" style={{ height: `${stepHeight(i, workflow.steps.length)}%` }} />
              ))}
            </div>
            <p className="min-w-0 text-[11px] leading-[1.4]">
              <strong className="block text-[22px] font-semibold tracking-[-0.03em] text-white/55">{String(workflow.steps.length).padStart(2, "0")} etapas</strong>
              {workflow.steps.map((s) => s.name).join(" · ")}
            </p>
          </div>
          <p className="mt-[30px] text-[22px] font-medium tracking-[-0.02em] text-white/40">{workflow.eyebrow}</p>
          <p className="mt-2 text-[12.5px] leading-[1.6]">{workflow.lead}</p>
        </aside>
      </div>

      <div className="animate-fade-up relative mt-6 flex items-end justify-between gap-6 max-[860px]:flex-col max-[860px]:items-start" style={delay(600)}>
        <span className="text-[clamp(3rem,8vw,7rem)] leading-[0.8] font-bold tracking-[-0.05em] text-white/[0.055] select-none max-[860px]:text-[3.4rem] max-sm:hidden" aria-hidden="true">
          ROCKET
        </span>
        <div className="text-right max-[860px]:text-left">
          <a href={hero.secondaryCta.href} className="group mb-3.5 inline-flex items-center gap-1.5 text-[11.5px] text-white/50 transition-colors hover:text-white">
            <span className="link-underline">{hero.secondaryCta.label}</span>
            <ArrowDown className="size-3 transition-transform duration-300 group-hover:translate-y-0.5" />
          </a>
          <ul className="flex flex-wrap items-center gap-x-[clamp(16px,2.2vw,32px)] gap-y-2 min-[861px]:justify-end">
            {services.items.map((service) => {
              const Icon = SERVICE_ICONS[service.id] ?? Sparkle;
              return (
                <li key={service.id} className="inline-flex items-center gap-[7px] text-[15px] tracking-[-0.01em] text-white/86">
                  <Icon className="size-[17px]" strokeWidth={1.5} aria-hidden="true" />
                  {service.name}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AnimatedHero({ hero, problem, services, workflow }: Content) {
  const sectionRef = useRef<HTMLElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)", true);
  const progress = useScrollProgress(sectionRef, ["start start", "end end"]);
  const [playing, setPlaying] = useState(true);

  // O vídeo só toca enquanto está visível: poupa bateria depois que a cena passa.
  useEffect(() => {
    const unsubscribe = progress.on("change", (p) => setPlaying(p < 0.98));
    return unsubscribe;
  }, [progress]);

  const stageScale = useTransform(progress, [T.shrink[0], T.shrink[1]], [1, isDesktop ? 0.88 : 0.92], { ease: easeInOut });
  const stageRadius = useTransform(progress, [T.shrink[0], T.shrink[1]], [0, isDesktop ? 36 : 24], { ease: easeInOut });
  const dim = useTransform(progress, [T.dim[0], T.dim[1]], [0, 0.78]);
  const textOpacity = useTransform(progress, [T.textOut[0], T.textOut[1]], [1, 0]);
  const textY = useTransform(progress, [0, T.textOut[1]], [0, -80]);
  const manifestOpacity = useTransform(progress, [T.manifestIn[0], T.manifestIn[1]], [0, 1]);
  const manifestY = useTransform(progress, [T.manifestIn[0], T.manifestIn[1]], [40, 0]);
  const fade = useTransform(progress, [T.fade[0], T.fade[1]], [0, 1]);

  return (
    <section ref={sectionRef} id="inicio" data-header="dark" className="relative h-[340vh] bg-ink">
      <div className="sticky top-0 h-svh overflow-hidden">
        <m.div style={{ scale: stageScale, borderRadius: stageRadius }} className="absolute inset-0 overflow-hidden will-change-transform">
          <HeroMedia play={playing} />
          <m.div style={{ opacity: dim }} className="absolute inset-0 bg-ink-soft" aria-hidden="true" />
          <m.div style={{ opacity: textOpacity, y: textY }} className="absolute inset-0">
            <HeroContent hero={hero} services={services} workflow={workflow} />
          </m.div>
        </m.div>

        <m.div style={{ opacity: manifestOpacity, y: manifestY }} className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <Manifesto problem={problem} progress={progress} />
        </m.div>

        <m.div style={{ opacity: fade }} className="pointer-events-none absolute inset-0 bg-ink" aria-hidden="true" />
      </div>
    </section>
  );
}

/** As palavras do problema, na ordem em que acendem. As da conclusão final ficam no acento. */
function manifestoWords(problem: Resolved<"problem">) {
  const words: { text: string; accent: boolean; breakBefore: boolean }[] = [];
  const push = (sentence: string, accent: boolean, breakBefore: boolean) =>
    sentence
      .split(/\s+/)
      .filter(Boolean)
      .forEach((text, i) => words.push({ text, accent, breakBefore: breakBefore && i === 0 }));
  problem.symptoms.forEach((s) => push(s.text, false, false));
  push(problem.conclusion[0], false, true);
  push(problem.conclusion[1], true, true);
  return words;
}

function Manifesto({ problem, progress }: { problem: Resolved<"problem">; progress: MotionValue<number> }) {
  const words = manifestoWords(problem);
  const [start, end] = T.words;
  const step = (end - start) / words.length;
  return (
    <div className="max-w-5xl text-center">
      <h2 className="text-eyebrow text-white/55">{problem.eyebrow}</h2>
      <p className="mt-8 text-[clamp(1.75rem,0.9rem+2.9vw,3.75rem)] leading-[1.1] font-semibold tracking-[-0.035em]">
        {words.map((word, i) => (
          <span key={i}>
            {word.breakBefore && <br />}
            <Word text={word.text} accent={word.accent} progress={progress} range={[start + i * step, start + (i + 1.6) * step]} />{" "}
          </span>
        ))}
      </p>
    </div>
  );
}

function Word({ text, accent, progress, range }: { text: string; accent: boolean; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <m.span style={{ opacity }} className={accent ? "text-accent" : "text-white"}>
      {text}
    </m.span>
  );
}

/** Versão para prefers-reduced-motion: a mesma abertura e o manifesto, sem movimento. */
function StaticHero({ hero, problem, services, workflow }: Content) {
  return (
    <section id="inicio" data-header="dark" className="bg-ink text-white">
      <div className="relative overflow-hidden">
        <HeroMedia play={false} />
        <HeroContent hero={hero} services={services} workflow={workflow} />
      </div>
      <div className="container-page py-28 text-center">
        <h2 className="text-eyebrow text-white/55">{problem.eyebrow}</h2>
        <p className="mx-auto mt-8 max-w-5xl text-[clamp(1.75rem,0.9rem+2.9vw,3.75rem)] leading-[1.1] font-semibold tracking-[-0.035em]">
          {problem.symptoms.map((s) => s.text).join(" ")}
          <br />
          {problem.conclusion[0]}
          <br />
          <span className="text-accent">{problem.conclusion[1]}</span>
        </p>
      </div>
    </section>
  );
}
