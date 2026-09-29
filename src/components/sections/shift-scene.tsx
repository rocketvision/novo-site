"use client";

import { useRef, useState } from "react";
import { motionValue, type MotionValue } from "motion/react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/animations/reveal";
import { Stage } from "@/components/visuals/primitives";
import { TransformationFor } from "@/components/visuals/transformations";
import type { Resolved } from "@/lib/content/resolved";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useRevealProgress } from "@/hooks/use-reveal-progress";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

type Shift = Resolved<"shift">;
type Problem = Resolved<"problem">;
type Item = Shift["groups"][number]["pairs"][number];

/** Cada painel acompanha duas transformações (operação, vendas, produto). O CMS garante dois pares por grupo. */
const pairsOf = (shift: Shift) => shift.groups.flatMap((g) => g.pairs);

/** Máximo de pares permitido pelo CMS (4 grupos de 2). */
const MAX_PAIRS = 8;

/**
 * O que muda.
 * Desktop: trilho horizontal preso ao scroll (GSAP ScrollTrigger). O título acende palavra por palavra
 * e cada transformação chega como um cartão grande: o improviso é riscado, a solução sobe no lugar
 * e o objeto ao lado se reorganiza no estado resolvido.
 * Mobile e reduced motion: lista editorial com os painéis intercalados.
 */
export function ShiftScene({ shift, problem }: { shift: Shift; problem: Problem }) {
  const reduceMotion = usePrefersReducedMotion();
  if (reduceMotion) return <StackedShift shift={shift} problem={problem} />;
  // As duas composições saem prontas do servidor e o CSS escolhe pelo breakpoint:
  // a página nasce com a altura certa e o F5 volta exatamente para o mesmo ponto.
  return (
    <>
      <div className="hidden lg:block">
        <HorizontalShift shift={shift} problem={problem} />
      </div>
      <div className="lg:hidden">
        <StackedShift shift={shift} problem={problem} idSuffix="-m" />
      </div>
    </>
  );
}

function HorizontalShift({ shift, problem }: { shift: Shift; problem: Problem }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const items = pairsOf(shift);
  const total = items.length;
  // Progresso de cada transformação, lido pelos visuais em motion (0 = improviso, 1 = resolvido).
  const [progressValues] = useState(() => Array.from({ length: MAX_PAIRS }, () => motionValue(0)));

  useGSAP(
    () => {
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;
      const q = gsap.utils.selector(section);
      const counter = q("[data-counter]")[0];
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      // O trilho: a rolagem vertical empurra os cartões para a esquerda.
      const move = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            gsap.set(q("[data-bar]"), { scaleX: self.progress });
            if (counter) counter.textContent = String(Math.min(total, Math.floor(self.progress * total) + 1)).padStart(2, "0");
          },
        },
      });

      // O título acende palavra por palavra enquanto a seção chega.
      const split = SplitText.create(q("[data-intro-title]"), { type: "words" });
      gsap.fromTo(
        split.words,
        { opacity: 0.14 },
        { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: section, start: "top 80%", end: "top top", scrub: true } },
      );

      q("[data-card]").forEach((card, i) => {
        const inner = card.querySelector("[data-card-inner]");
        // Cada cartão cresce ao chegar no centro e recua ao sair, como uma vitrine passando.
        gsap
          .timeline({ scrollTrigger: { trigger: card, containerAnimation: move, start: "left right", end: "right left", scrub: true } })
          .fromTo(inner, { scale: 0.84, opacity: 0.3, y: 40 }, { scale: 1, opacity: 1, y: 0, duration: 1, ease: "power2.out" })
          .to(inner, { duration: 0.5 })
          .to(inner, { scale: 0.9, opacity: 0.3, y: -20, duration: 1, ease: "power2.in" });

        // O improviso é riscado, perde força e a solução sobe no lugar; o visual acompanha.
        gsap
          .timeline({
            scrollTrigger: {
              trigger: card,
              containerAnimation: move,
              start: "left 75%",
              end: "center 45%",
              scrub: true,
              onUpdate: (self) => progressValues[i]?.set(self.progress),
            },
          })
          .fromTo(card.querySelector("[data-strike]"), { backgroundSize: "0% 2px" }, { backgroundSize: "100% 2px", duration: 0.4, ease: "none" })
          .to(card.querySelector("[data-before]"), { opacity: 0.35, duration: 0.3 }, 0.3)
          .fromTo(card.querySelector("[data-after]"), { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5 }, 0.45);
      });

      return () => split.revert();
    },
    { scope: sectionRef, dependencies: [total] },
  );

  return (
    // Altura proporcional ao número de pares: cada cartão ganha quase uma tela de rolagem.
    <section
      ref={sectionRef}
      aria-labelledby="shift-titulo"
      style={{ height: `${(total + 1) * 88}vh` }}
      className="relative bg-ink text-white"
      data-header="dark"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div
          ref={trackRef}
          className="flex h-full w-max items-center gap-[3vw] pr-[14vw] pl-[max(3rem,calc((100vw-80rem)/2+3rem))] will-change-transform"
        >
          <div className="w-[44vw] shrink-0 pr-[4vw]">
            <Eyebrow className="text-white/55">{shift.eyebrow}</Eyebrow>
            <h2 id="shift-titulo" data-intro-title className="mt-6 text-[clamp(2.5rem,1rem+3.4vw,5rem)] leading-[1.02] font-semibold tracking-[-0.04em]">
              {shift.title}
            </h2>
            <p className="mt-10 flex items-center gap-3 font-mono text-xs text-white/45" aria-hidden="true">
              Role para ver
              <span className="inline-block h-px w-16 bg-accent" />
            </p>
          </div>

          <ol className="contents">
            {items.map((item, i) => (
              <ShiftCard key={i} item={item} index={i} total={total} t={progressValues[i]} problem={problem} />
            ))}
          </ol>
        </div>

        <div
          className="pointer-events-none absolute bottom-8 left-[max(3rem,calc((100vw-80rem)/2+3rem))] flex items-center gap-5 font-mono text-xs text-white/50"
          aria-hidden="true"
        >
          <span data-counter className="text-white tabular-nums">
            01
          </span>
          <span className="relative h-px w-48 bg-white/15">
            <span data-bar className="absolute inset-0 origin-left scale-x-0 bg-accent" />
          </span>
          <span className="tabular-nums">{String(total).padStart(2, "0")}</span>
        </div>
      </div>
    </section>
  );
}

function ShiftCard({ item, index, total, t, problem }: { item: Item; index: number; total: number; t: MotionValue<number>; problem: Problem }) {
  return (
    <li data-card className="h-[76svh] w-[72vw] max-w-[78rem] shrink-0">
      <div data-card-inner className="relative grid h-full grid-cols-[0.95fr_1.05fr] overflow-hidden rounded-[2.25rem] bg-[#151517] shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)] ring-1 ring-white/10">
        <div className="relative z-10 flex flex-col justify-between p-[clamp(2rem,3vw,3.5rem)]">
          <p className="font-mono text-xs text-white/45 tabular-nums">
            <span className="text-accent">{String(index + 1).padStart(2, "0")}</span> / {String(total).padStart(2, "0")}
          </p>
          <div>
            <p data-before className="text-[clamp(1.25rem,0.8rem+0.9vw,1.75rem)] leading-snug tracking-tight text-white/70">
              <span className="sr-only">Antes: </span>
              <span data-strike className="bg-[linear-gradient(var(--color-accent),var(--color-accent))] bg-[length:0%_2px] bg-[position:0_58%] bg-no-repeat">
                {item.before}
              </span>
            </p>
            <p data-after className="mt-6 text-[clamp(2rem,0.9rem+2.2vw,3.5rem)] leading-[1.04] font-semibold tracking-[-0.035em]">
              <span className="sr-only">Depois: </span>
              {item.after}
            </p>
          </div>
        </div>
        <div className="relative m-3 overflow-hidden rounded-[1.75rem]">
          <div className={panelClass} />
          <Stage size={[2.9, 3.3]}>
            <TransformationFor index={index} t={t} before={item.before} after={item.after} problem={problem} />
          </Stage>
        </div>
      </div>
    </li>
  );
}

const firstPairOf = (shift: Shift, group: number) => shift.groups.slice(0, group).reduce((n, g) => n + g.pairs.length, 0);

/** Fundo dos painéis: o escuro da seção com um brilho discreto da cor de destaque. */
const panelClass =
  "absolute inset-0 bg-ink-soft bg-[radial-gradient(90%_70%_at_75%_15%,rgb(255_91_31/0.16),transparent_65%)]";

/** Mobile e reduced motion: a transformação acontece quando o painel entra na tela. */
function RevealedPair({ index, pair, problem }: { index: number; pair: Item; problem: Problem }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useRevealProgress(ref);
  return (
    <div ref={ref} className="relative h-full">
      <Stage size={[3.3, 4.6]}>
        <TransformationFor index={index} t={t} before={pair.before} after={pair.after} problem={problem} />
      </Stage>
    </div>
  );
}

function StackedShift({ shift, problem, idSuffix = "" }: { shift: Shift; problem: Problem; idSuffix?: string }) {
  return (
    <section aria-labelledby={`shift-titulo${idSuffix}`} className="bg-ink pt-24 pb-24 text-white md:pt-32" data-header="dark">
      <div className="container-page">
        <Eyebrow className="text-white/55">{shift.eyebrow}</Eyebrow>
        <h2 id={`shift-titulo${idSuffix}`} className="text-title mt-6 max-w-2xl">
          {shift.title}
        </h2>
      </div>

      {shift.groups.map((group, g) => (
        <div key={g} className="mt-16 md:mt-24">
          <Reveal className="relative mx-4 aspect-[4/5] overflow-hidden rounded-[1.5rem] sm:mx-8 sm:aspect-[16/10]">
            <div className={panelClass} />
            <div className="absolute inset-0 grid grid-rows-2 sm:grid-cols-2 sm:grid-rows-1">
              {group.pairs.map((pair, j) => (
                <RevealedPair key={j} index={firstPairOf(shift, g) + j} pair={pair} problem={problem} />
              ))}
            </div>
          </Reveal>
          <ol className="container-page mt-4">
            {group.pairs.map((item, i) => (
              <Reveal as="li" key={i} className="border-b border-white/10 py-8">
                <p className="text-body text-white/60">
                  <span className="sr-only">Antes: </span>
                  <span className="line-through decoration-accent decoration-2">{item.before}</span>
                </p>
                <p className="text-title mt-3">
                  <span className="sr-only">Depois: </span>
                  {item.after}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
