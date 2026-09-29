"use client";

import { useLayoutEffect, useRef } from "react";
import { cubicBezier, m, useMotionValue, useTransform } from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Photo } from "@/components/ui/photo";
import { ProblemChaos } from "./problem-chaos";
import type { Resolved } from "@/lib/content/resolved";
import { useMediaQuery, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { useHeaderTheme } from "@/hooks/use-header-theme";
import { insetClip, lerp, segment } from "@/lib/scroll";
import { ease } from "@/lib/motion";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;
const easeInOut = cubicBezier(...ease.inOut);

type Content = { hero: Resolved<"hero">; problem: Resolved<"problem"> };

/** Janela da fotografia no início da cena, em % do palco: topo, direita, base, esquerda. */
type Frame = [number, number, number, number];

/**
 * Cena de abertura.
 *
 * 1. A promessa ocupa a tela e a fotografia aparece por uma janela recortada.
 * 2. Com o scroll, a janela se abre até a foto ocupar toda a viewport.
 * 3. A foto escurece e os improvisos da operação caem sobre ela, um a um.
 * 4. A imagem se apaga no preto da próxima seção.
 */
export function HeroScene(content: Content) {
  const reduceMotion = usePrefersReducedMotion();
  return reduceMotion ? <StaticHero {...content} /> : <AnimatedHero {...content} />;
}

function HeroText({
  hero,
  headlineRef,
  columnRef,
  textRef,
}: {
  hero: Resolved<"hero">;
  headlineRef?: React.Ref<HTMLHeadingElement>;
  columnRef?: React.Ref<HTMLDivElement>;
  textRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div ref={textRef} className="flex h-full flex-col">
      <p className="text-eyebrow animate-fade-up text-muted" style={delay(0)}>
        {hero.eyebrow}
      </p>
      <h1 ref={headlineRef} className="text-hero mt-5 text-ink lg:mt-6">
        {hero.titleLines.map((line, i) => (
          <span key={i} className="block overflow-hidden pb-[0.06em]">
            <span className="animate-rise block" style={delay(80 + i * 90)}>
              {line}
            </span>
          </span>
        ))}
      </h1>
      <div ref={columnRef} className="mt-5 max-w-md lg:mt-auto lg:w-[29%] lg:max-w-none">
        <p className="animate-fade-up text-[1.0625rem] leading-relaxed text-muted lg:text-lg" style={delay(420)}>
          {hero.lead}
        </p>
        <div className="animate-fade-up mt-6 flex flex-wrap items-center gap-x-5 gap-y-3" style={delay(540)}>
          <ButtonLink href={hero.primaryCta.href} size="lg" icon={<ArrowRight className="size-4" />}>
            {hero.primaryCta.label}
          </ButtonLink>
          <a href={hero.secondaryCta.href} className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-graphite">
            <span className="link-underline">{hero.secondaryCta.label}</span>
            <ArrowDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

function AnimatedHero({ hero, problem }: Content) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);

  const progress = useScrollProgress(sectionRef, ["start start", "end end"]);
  useHeaderTheme(sectionRef, progress, (v) => v > 0.28);

  // A janela inicial da foto é medida a partir do texto real, em qualquer tela.
  const frame = useMotionValue<Frame>([54, 3.4, 5, 33]);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const text = textRef.current;
    const headline = headlineRef.current;
    const column = columnRef.current;
    if (!stage || !text || !headline || !column) return;

    const measure = () => {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const gutter = W >= 1024 ? 48 : W >= 640 ? 32 : 16;
      // offsetTop ignora o transform do scroll; a posição horizontal não é animada.
      if (isDesktop) {
        const top = headline.offsetTop + headline.offsetHeight + 32;
        const left = column.getBoundingClientRect().right - stage.getBoundingClientRect().left + 48;
        frame.set([(top / H) * 100, (gutter / W) * 100, (gutter / H) * 100, (left / W) * 100]);
      } else {
        const top = column.offsetTop + column.offsetHeight + 28;
        frame.set([(top / H) * 100, (gutter / W) * 100, (gutter / H) * 100, (gutter / W) * 100]);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(text);
    return () => observer.disconnect();
  }, [frame, isDesktop]);

  // 1. A janela se abre até a foto ocupar a viewport.
  const clipPath = useTransform(() => {
    const t = easeInOut(segment(progress.get(), 0, 0.4));
    const [top, right, bottom, left] = frame.get();
    return insetClip(lerp(top, 0, t), lerp(right, 0, t), lerp(bottom, 0, t), lerp(left, 0, t), lerp(22, 0, t));
  });
  // A foto começa aproximada e "recua" enquanto a janela abre, depois segue com um zoom lento.
  const photoScale = useTransform(progress, [0, 0.4, 1], [1.22, 1, 1.07]);
  const textOpacity = useTransform(progress, [0.08, 0.26], [1, 0]);
  const textY = useTransform(progress, [0, 0.3], [0, -56]);
  // 2. A foto escurece para o problema entrar, e no final se funde ao preto da próxima seção.
  const shade = useTransform(progress, [0.34, 0.5, 0.88, 1], [0, 0.66, 0.66, 0.94]);

  return (
    <section ref={sectionRef} id="inicio" data-header="light" className="relative h-[300vh] bg-paper lg:h-[340vh]">
      <div ref={stageRef} className="sticky top-0 h-svh overflow-hidden">
        <m.div
          style={{ opacity: textOpacity, y: textY }}
          className="container-page absolute inset-x-0 top-0 bottom-0 pt-[calc(var(--header-height)+1.75rem)] pb-6 lg:pt-[calc(var(--header-height)+2.5rem)] lg:pb-12"
        >
          <HeroText hero={hero} textRef={textRef} headlineRef={headlineRef} columnRef={columnRef} />
        </m.div>

        <m.div style={{ clipPath }} className="animate-fade-in absolute inset-0">
          <m.div style={{ scale: photoScale }} className="absolute inset-0">
            <Photo photo={hero.image} sizes="100vw" priority className="object-[28%_50%] lg:object-center" />
          </m.div>
          <m.div style={{ opacity: shade }} className="absolute inset-0 bg-ink" />
        </m.div>

        <ProblemChaos problem={problem} progress={progress} start={0.46} />
      </div>
    </section>
  );
}

/** Versão para prefers-reduced-motion: mesma narrativa, sem movimento. */
function StaticHero({ hero, problem }: Content) {
  return (
    <>
      <section id="inicio" className="bg-paper pt-[calc(var(--header-height)+2rem)] pb-16">
        <div className="container-page">
          <HeroText hero={hero} />
          <div className="relative mt-12 aspect-[16/9] overflow-hidden rounded-3xl">
            <Photo photo={hero.image} sizes="100vw" priority />
          </div>
        </div>
      </section>
      <section className="bg-ink py-28 text-white" data-header="dark">
        <div className="container-page">
          <Eyebrow className="text-white/60">{problem.eyebrow}</Eyebrow>
          <ul className="mt-8 grid gap-3 text-lg text-white/75 sm:grid-cols-2">
            {problem.symptoms.map((symptom, i) => (
              <li key={i}>{symptom.text}</li>
            ))}
          </ul>
          <p className="text-title mt-10">
            {problem.conclusion[0]} <span className="text-accent">{problem.conclusion[1]}</span>
          </p>
        </div>
      </section>
    </>
  );
}
