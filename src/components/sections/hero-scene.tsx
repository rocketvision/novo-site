"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cubicBezier, m, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { RocketVideo } from "@/components/ui/rocket-video";
import type { Resolved } from "@/lib/content/resolved";
import { useMediaQuery, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { ease } from "@/lib/motion";
import { site } from "@/lib/site";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;
const easeInOut = cubicBezier(...ease.inOut);

type Content = {
  hero: Resolved<"hero">;
  problem: Resolved<"problem">;
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

/**
 * Abertura.
 *
 * 1. O lançamento do foguete ocupa a tela inteira, em loop. Por cima, direto sobre o vídeo,
 *    a assinatura da marca, a promessa e os dois caminhos. Entram uma única vez, em cascata.
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

/** Fundo da abertura: o vídeo e a máscara que protege a leitura sem apagar a cena. */
function HeroMedia({ play, still = false }: { play: boolean; still?: boolean }) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <RocketVideo play={play} still={still} />
      {/* O foguete sobe no centro-direita e o fim do vídeo é um mar de nuvens claras: a máscara
          pesa à esquerda e embaixo, onde está o texto, e some sobre o foguete. No celular o texto
          fica embaixo, então a máscara sobe do rodapé. O topo escurece de leve para o menu. */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(5_7_11/0.86)_0%,rgb(5_7_11/0.62)_28%,rgb(5_7_11/0.18)_52%,rgb(5_7_11/0)_68%),linear-gradient(0deg,rgb(5_7_11/0.72)_0%,rgb(5_7_11/0.2)_30%,transparent_50%),linear-gradient(180deg,rgb(5_7_11/0.5)_0%,transparent_18%)] max-md:bg-[linear-gradient(180deg,rgb(5_7_11/0.55)_0%,rgb(5_7_11/0)_20%,rgb(5_7_11/0)_36%,rgb(5_7_11/0.62)_56%,rgb(5_7_11/0.9)_78%,rgb(5_7_11/0.96)_100%)]" />
    </div>
  );
}

function HeroContent({ hero }: { hero: Resolved<"hero"> }) {
  // Telas baixas (celular deitado): tudo mais compacto para os botões caberem na primeira dobra.
  return (
    <div className="container-page relative flex min-h-svh flex-col justify-end pt-[calc(var(--header-height)+2rem)] pb-[max(2.5rem,8svh)] md:justify-center md:pb-[calc(var(--header-height)*0.5)] [@media(max-height:560px)]:pt-[calc(var(--header-height)+0.5rem)] [@media(max-height:560px)]:pb-5">
      <div className="max-w-[48rem]">
        <p className="animate-fade-in text-eyebrow text-white/70" style={delay(0)}>
          {site.name} <span className="text-white/40">—</span> {site.slogan}
        </p>

        <h1 className="text-hero mt-5 max-w-[6.2em] text-white [text-shadow:0_4px_32px_rgb(0_0_0/0.35)] max-sm:text-[clamp(2.5rem,11.5vw,3.25rem)] md:mt-6 [@media(max-height:560px)]:mt-3">
          {hero.titleLines.map((line, i) => (
            <span key={i} className="animate-headline block" style={delay(140 + i * 90)}>
              <TitleLine line={line} />
            </span>
          ))}
        </h1>

        <p className="animate-fade-up mt-6 max-w-[30rem] text-[1.0625rem] leading-[1.6] text-white/75 md:mt-7 md:text-lg [@media(max-height:560px)]:mt-3 [@media(max-height:560px)]:text-[0.9375rem] [@media(max-height:560px)]:leading-normal" style={delay(520)}>
          {hero.lead}
        </p>

        <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-3 md:mt-10 [@media(max-height:560px)]:mt-4" style={delay(720)}>
          <Link
            href={hero.primaryCta.href}
            className="group inline-flex h-13 items-center gap-3 rounded-full bg-[linear-gradient(96deg,var(--color-accent)_0%,var(--color-accent-soft)_100%)] py-1.5 pr-1.5 pl-6 text-base font-semibold tracking-[-0.01em] whitespace-nowrap text-white shadow-[0_14px_40px_rgb(255_91_31/0.32)] transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgb(255_91_31/0.46)] active:translate-y-0 active:scale-[0.98] max-[400px]:w-full max-[400px]:justify-between"
          >
            {hero.primaryCta.label}
            <span className="grid size-10 place-items-center rounded-full bg-white text-ink" aria-hidden="true">
              <ArrowRight className="size-[1.1rem] transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            href={hero.secondaryCta.href}
            className={buttonClasses({
              variant: "secondary",
              size: "lg",
              className:
                "bg-white/[0.04] text-white ring-white/25 backdrop-blur-md hover:bg-white/[0.08] hover:text-white hover:ring-white/50 max-[400px]:w-full",
            })}
          >
            <span>{hero.secondaryCta.label}</span>
            <ArrowUpRight
              className="-mr-1 size-4 transition-transform duration-300 ease-out group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

function AnimatedHero({ hero, problem }: Content) {
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
            <HeroContent hero={hero} />
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
function StaticHero({ hero, problem }: Content) {
  return (
    <section id="inicio" data-header="dark" className="bg-ink text-white">
      <div className="relative overflow-hidden">
        <HeroMedia play={false} still />
        <HeroContent hero={hero} />
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
