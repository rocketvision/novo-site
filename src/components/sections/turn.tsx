"use client";

import { useRef } from "react";
import { m, useTransform, type MotionValue } from "motion/react";
import { LogoMark } from "@/components/ui/logo";
import type { Resolved } from "@/lib/content/resolved";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";

/**
 * Momento tipográfico antes do convite final.
 * Uma frase é riscada, se desmonta palavra por palavra e dá lugar à outra no mesmo lugar.
 */
type Content = Resolved<"turn">;

export function Turn({ turn }: { turn: Content }) {
  const reduceMotion = usePrefersReducedMotion();
  return reduceMotion ? <StaticTurn turn={turn} /> : <AnimatedTurn turn={turn} />;
}

/** A palavra riscada é escolhida no CMS; a pontuação colada a ela não conta na comparação. */
const bare = (word: string) => word.replace(/[.,!?;:]+$/, "");

function AnimatedTurn({ turn }: { turn: Content }) {
  const fromWords = turn.from.split(/\s+/);
  const toWords = turn.to.split(/\s+/);
  const struck = fromWords.findIndex((w) => bare(w) === turn.strike.trim());

  const ref = useRef<HTMLElement>(null);
  const progress = useScrollProgress(ref, ["start start", "end end"]);
  const strike = useTransform(progress, [0.1, 0.24], [0, 1]);
  const rocketOpacity = useTransform(progress, [0.78, 0.86], [0, 1]);
  const rocketX = useTransform(progress, [0.78, 1], ["-0.3em", "0.25em"]);
  const rocketY = useTransform(progress, [0.78, 1], ["0.3em", "-0.15em"]);

  return (
    <section ref={ref} aria-label={`${turn.from} ${turn.to}`} className="relative h-[240vh] bg-paper">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div className="container-page">
          <p aria-hidden="true" className="text-display grid text-ink">
            <span className="[grid-area:1/1]">
              {fromWords.map((word, i) => (
                <OutWord key={i} index={i} progress={progress}>
                  {word}
                  {i === struck && (
                    <m.span
                      style={{ scaleX: strike }}
                      className="absolute top-[55%] left-0 h-[0.07em] w-full origin-left bg-accent"
                    />
                  )}
                </OutWord>
              ))}
            </span>
            <span className="[grid-area:1/1]">
              {toWords.map((word, i) => {
                const isLast = i === toWords.length - 1;
                return (
                  <InWord key={i} index={i} progress={progress} accent={isLast}>
                    {word}
                    {isLast && (
                      <m.span
                        style={{ opacity: rocketOpacity, x: rocketX, y: rocketY }}
                        className="absolute top-[-0.1em] left-full ml-[0.15em]"
                      >
                        <LogoMark className="size-[0.55em] text-accent" />
                      </m.span>
                    )}
                  </InWord>
                );
              })}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

function OutWord({ children, index, progress }: { children: React.ReactNode; index: number; progress: MotionValue<number> }) {
  const start = 0.28 + index * 0.028;
  const opacity = useTransform(progress, [start, start + 0.08], [1, 0]);
  const y = useTransform(progress, [start, start + 0.1], ["0em", "-0.5em"]);
  return (
    <m.span style={{ opacity, y }} className="relative mr-[0.22em] inline-block">
      {children}
    </m.span>
  );
}

function InWord({
  children,
  index,
  progress,
  accent,
}: {
  children: React.ReactNode;
  index: number;
  progress: MotionValue<number>;
  accent: boolean;
}) {
  const start = 0.52 + index * 0.06;
  const opacity = useTransform(progress, [start, start + 0.1], [0, 1]);
  const y = useTransform(progress, [start, start + 0.12], ["0.6em", "0em"]);
  return (
    <m.span style={{ opacity, y }} className={accent ? "relative mr-[0.22em] inline-block text-accent" : "mr-[0.22em] inline-block"}>
      {children}
    </m.span>
  );
}

function StaticTurn({ turn }: { turn: Content }) {
  return (
    <section className="bg-paper py-32">
      <div className="container-page text-display text-ink">
        <p className="text-black/30 line-through decoration-accent">{turn.from}</p>
        <p className="mt-6">{turn.to}</p>
      </div>
    </section>
  );
}
