"use client";

import { useRef } from "react";
import { m, useTransform, type MotionValue } from "motion/react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/animations/reveal";
import { shift } from "@/content/landing";
import { media } from "@/content/media";
import { useMediaQuery, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { insetClip, segment } from "@/lib/scroll";

type Item = (typeof shift.items)[number];

/** Cada foto acompanha duas transformações: operação, vendas, produto. */
const PAIRS_PER_PHOTO = 2;
const total = shift.items.length;

/**
 * O que muda.
 * Desktop: palco fixo. Cada improviso é riscado pelo scroll e dá lugar à versão resolvida,
 * enquanto a fotografia à direita troca por cortina a cada dois temas.
 * Mobile e reduced motion: lista editorial com as fotos intercaladas.
 */
export function ShiftScene() {
  const isDesktop = useMediaQuery("(min-width: 1024px)", false);
  const reduceMotion = usePrefersReducedMotion();
  return isDesktop && !reduceMotion ? <StageShift /> : <StackedShift />;
}

function StageShift() {
  const ref = useRef<HTMLElement>(null);
  const progress = useScrollProgress(ref, ["start start", "end end"]);
  const barScale = useTransform(progress, [0, 1], [0, 1]);
  const counter = useTransform(progress, (v) => String(Math.min(total, Math.floor(v * total) + 1)).padStart(2, "0"));

  return (
    <section ref={ref} aria-labelledby="shift-titulo" className="relative h-[560vh] bg-ink text-white" data-header="dark">
      <div className="sticky top-0 flex h-svh overflow-hidden">
        <div className="relative z-10 flex w-[46%] flex-col justify-between py-[calc(var(--header-height)+2.5rem)] pr-12 pl-[max(3rem,calc((100vw-80rem)/2+3rem))]">
          <div>
            <Eyebrow className="text-white/55">{shift.eyebrow}</Eyebrow>
            <h2 id="shift-titulo" className="mt-5 max-w-md text-xl leading-snug font-medium tracking-tight text-white/70">
              {shift.title}
            </h2>
          </div>

          <ol className="relative min-h-[18rem]">
            {shift.items.map((item, i) => (
              <Pair key={item.before} item={item} index={i} progress={progress} />
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
          {media.shift.map((photo, i) => (
            <ShiftPhoto key={i} index={i} progress={progress} photo={photo} />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-ink/40 via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}

function Pair({ item, index, progress }: { item: Item; index: number; progress: MotionValue<number> }) {
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

function ShiftPhoto({ index, progress, photo }: { index: number; progress: MotionValue<number>; photo: (typeof media.shift)[number] }) {
  const groups = Math.ceil(total / PAIRS_PER_PHOTO);
  const start = index / groups;
  const end = (index + 1) / groups;
  // A próxima foto sobe por cima da anterior como uma cortina.
  const clipPath = useTransform(progress, (v) => {
    if (index === 0) return insetClip(0, 0, 0, 0);
    const t = segment(v, start - 0.05, start + 0.03);
    return insetClip((1 - t) * 100, 0, 0, 0);
  });
  const scale = useTransform(progress, [start - 0.05, end], [1.16, 1]);

  return (
    <m.div style={{ clipPath }} className="absolute inset-0">
      <m.div style={{ scale }} className="absolute inset-0">
        <Photo photo={photo} sizes="55vw" decorative />
      </m.div>
    </m.div>
  );
}

function StackedShift() {
  return (
    <section aria-labelledby="shift-titulo" className="bg-ink pt-24 pb-24 text-white md:pt-32" data-header="dark">
      <div className="container-page">
        <Eyebrow className="text-white/55">{shift.eyebrow}</Eyebrow>
        <h2 id="shift-titulo" className="text-title mt-6 max-w-2xl">
          {shift.title}
        </h2>
      </div>

      {media.shift.map((photo, g) => (
        <div key={g} className="mt-16 md:mt-24">
          <Reveal className="relative mx-4 aspect-[4/5] overflow-hidden rounded-[1.5rem] sm:mx-8 sm:aspect-[16/10]">
            <Photo photo={photo} sizes="100vw" decorative />
          </Reveal>
          <ol className="container-page mt-4">
            {shift.items.slice(g * PAIRS_PER_PHOTO, g * PAIRS_PER_PHOTO + PAIRS_PER_PHOTO).map((item) => (
              <Reveal as="li" key={item.before} className="border-b border-white/10 py-8">
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
