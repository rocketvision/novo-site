"use client";

import { useRef } from "react";
import { m, useTransform, type MotionValue } from "motion/react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/animations/reveal";
import { Stage } from "@/components/visuals/primitives";
import { TransformationFor } from "@/components/visuals/transformations";
import type { Resolved } from "@/lib/content/resolved";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { useRevealProgress } from "@/hooks/use-reveal-progress";
import { insetClip, segment } from "@/lib/scroll";

type Shift = Resolved<"shift">;
type Problem = Resolved<"problem">;
type Item = Shift["groups"][number]["pairs"][number];

/** Cada painel acompanha duas transformações (operação, vendas, produto). O CMS garante dois pares por grupo. */
const pairsOf = (shift: Shift) => shift.groups.flatMap((g) => g.pairs);

/**
 * O que muda.
 * Desktop: palco fixo. Cada improviso é riscado pelo scroll e dá lugar à versão resolvida,
 * enquanto, no painel à direita, o mesmo objeto do improviso que caiu no hero se reorganiza
 * no estado resolvido. O painel troca por cortina a cada dois temas.
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
        <StageShift shift={shift} problem={problem} />
      </div>
      <div className="lg:hidden">
        <StackedShift shift={shift} problem={problem} idSuffix="-m" />
      </div>
    </>
  );
}

function StageShift({ shift, problem }: { shift: Shift; problem: Problem }) {
  const ref = useRef<HTMLElement>(null);
  const items = pairsOf(shift);
  const total = items.length;
  const groups = shift.groups.length;
  const progress = useScrollProgress(ref, ["start start", "end end"]);
  const barScale = useTransform(progress, [0, 1], [0, 1]);
  const counter = useTransform(progress, (v) => String(Math.min(total, Math.floor(v * total) + 1)).padStart(2, "0"));

  return (
    // Altura proporcional ao número de pares: com os 6 originais, 560vh.
    <section ref={ref} aria-labelledby="shift-titulo" style={{ height: `${Math.round((total * 560) / 6)}vh` }} className="relative bg-ink text-white" data-header="dark">
      <div className="sticky top-0 flex h-svh overflow-hidden">
        <div className="relative z-10 flex w-[46%] flex-col justify-between py-[calc(var(--header-height)+2.5rem)] pr-12 pl-[max(3rem,calc((100vw-80rem)/2+3rem))]">
          <div>
            <Eyebrow className="text-white/55">{shift.eyebrow}</Eyebrow>
            <h2 id="shift-titulo" className="mt-5 max-w-md text-xl leading-snug font-medium tracking-tight text-white/70">
              {shift.title}
            </h2>
          </div>

          <ol className="relative min-h-[18rem]">
            {items.map((item, i) => (
              <Pair key={i} item={item} index={i} total={total} progress={progress} />
            ))}
          </ol>

          <div className="flex items-center gap-5 font-mono text-xs text-white/50" aria-hidden="true">
            <m.span className="tabular-nums text-white">{counter}</m.span>
            <span className="relative h-px w-40 bg-white/15">
              <m.span style={{ scaleX: barScale }} className="absolute inset-0 origin-left bg-accent" />
            </span>
            <span className="tabular-nums">{String(total).padStart(2, "0")}</span>
          </div>
        </div>

        <div className="relative my-[calc(var(--header-height)+1rem)] flex-1 overflow-hidden rounded-l-[2rem]">
          {shift.groups.map((group, i) => (
            <ShiftPanel
              key={i}
              index={i}
              groups={groups}
              progress={progress}
              first={firstPairOf(shift, i)}
              total={total}
              pairs={group.pairs}
              problem={problem}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Pair({ item, index, total, progress }: { item: Item; index: number; total: number; progress: MotionValue<number> }) {
  const start = index / total;
  const end = (index + 1) / total;
  const w = end - start;
  const first = index === 0;
  const last = index === total - 1;

  // Entra, fica e sai dentro do seu trecho do scroll.
  const opacity = useTransform(
    progress,
    [start, start + w * 0.12, end - w * 0.14, end],
    [first ? 1 : 0, 1, 1, last ? 1 : 0],
  );
  const y = useTransform(progress, [start, start + w * 0.14, end - w * 0.14, end], [first ? 0 : 40, 0, 0, last ? 0 : -40]);
  // O improviso é riscado e perde força; a solução sobe no lugar.
  const strike = useTransform(progress, [start + w * 0.12, start + w * 0.42], [0, 1]);
  const beforeOpacity = useTransform(progress, [start + w * 0.3, start + w * 0.55], [1, 0.4]);
  const afterOpacity = useTransform(progress, [start + w * 0.38, start + w * 0.62], [0, 1]);
  const afterY = useTransform(progress, [start + w * 0.38, start + w * 0.62], [28, 0]);
  // O risco percorre o texto linha por linha, como uma caneta.
  const strikeSize = useTransform(strike, (v) => `${v * 100}% 2px`);

  return (
    <m.li style={{ opacity, y }} className="absolute inset-0 flex flex-col justify-center">
      <m.p style={{ opacity: beforeOpacity }} className="text-2xl leading-snug tracking-tight text-white/70 xl:text-[1.75rem]">
        <span className="sr-only">Antes: </span>
        <m.span
          style={{
            backgroundImage: "linear-gradient(var(--color-accent), var(--color-accent))",
            backgroundPosition: "0 58%",
            backgroundRepeat: "no-repeat",
            backgroundSize: strikeSize,
          }}
        >
          {item.before}
        </m.span>
      </m.p>
      <m.p
        style={{ opacity: afterOpacity, y: afterY }}
        className="mt-6 text-[clamp(2.25rem,1rem+2.6vw,3.75rem)] leading-[1.04] font-semibold tracking-[-0.035em]"
      >
        <span className="sr-only">Depois: </span>
        {item.after}
      </m.p>
    </m.li>
  );
}

const firstPairOf = (shift: Shift, group: number) => shift.groups.slice(0, group).reduce((n, g) => n + g.pairs.length, 0);

/** Fundo dos painéis: o escuro da seção com um brilho discreto da cor de destaque. */
const panelClass =
  "absolute inset-0 bg-ink-soft bg-[radial-gradient(90%_70%_at_75%_15%,rgb(255_91_31/0.16),transparent_65%)]";

function ShiftPanel({
  index,
  groups,
  progress,
  first,
  total,
  pairs,
  problem,
}: {
  index: number;
  groups: number;
  progress: MotionValue<number>;
  first: number;
  total: number;
  pairs: Item[];
  problem: Problem;
}) {
  const start = index / groups;
  const end = (index + 1) / groups;
  // O próximo painel sobe por cima do anterior como uma cortina.
  const clipPath = useTransform(progress, (v) => {
    if (index === 0) return insetClip(0, 0, 0, 0);
    const t = segment(v, start - 0.05, start + 0.03);
    return insetClip((1 - t) * 100, 0, 0, 0);
  });
  const scale = useTransform(progress, [start - 0.05, end], [1.16, 1]);

  return (
    <m.div style={{ clipPath }} className={panelClass}>
      <m.div style={{ scale }} className="absolute inset-0">
        {pairs.map((pair, j) => (
          <PairVisual key={j} index={first + j} total={total} leads={j === 0} progress={progress} pair={pair} problem={problem} />
        ))}
      </m.div>
    </m.div>
  );
}

/** A transformação acompanha o risco do texto: começa quando o improviso é riscado e assenta com o "depois". */
function PairVisual({
  index,
  total,
  leads,
  progress,
  pair,
  problem,
}: {
  index: number;
  total: number;
  /** Primeiro par do painel: entra junto com a cortina, sem fade. */
  leads: boolean;
  progress: MotionValue<number>;
  pair: Item;
  problem: Problem;
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const w = end - start;
  const t = useTransform(progress, (v) => segment(v, start + w * 0.14, start + w * 0.62));
  // Sai e entra no mesmo ritmo do texto ao lado, com uma troca curta na fronteira.
  const opacity = useTransform(progress, [start, start + w * 0.06, end - w * 0.06, end], [leads ? 1 : 0, 1, 1, index === total - 1 ? 1 : 0]);
  const y = useTransform(progress, [start, start + w * 0.1], [leads ? "0em" : "1.5em", "0em"]);

  return (
    <m.div style={{ opacity, y }} className="absolute inset-0">
      <Stage size={[2.7, 3.1]}>
        <TransformationFor index={index} t={t} before={pair.before} after={pair.after} problem={problem} />
      </Stage>
    </m.div>
  );
}

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
