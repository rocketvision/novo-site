"use client";

import { useRef } from "react";
import { m, useTransform } from "motion/react";
import { statement } from "@/content/landing";
import { media } from "@/content/media";
import { LogoMark } from "@/components/ui/logo";
import { Photo } from "@/components/ui/photo";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { useHeaderTheme } from "@/hooks/use-header-theme";
import { insetClip, segment } from "@/lib/scroll";

/**
 * Virada da narrativa: o escuro do problema dá lugar à luz da solução.
 * O fundo clareia, a proposta ganha foco e a fotografia sobe por trás do texto.
 */
export function Statement() {
  const reduceMotion = usePrefersReducedMotion();
  return reduceMotion ? <StaticStatement /> : <AnimatedStatement />;
}

function AnimatedStatement() {
  const ref = useRef<HTMLElement>(null);
  const progress = useScrollProgress(ref, ["start start", "end end"]);
  useHeaderTheme(ref, progress, (v) => v < 0.18);

  const background = useTransform(progress, [0, 0.3], ["#0a0a0b", "#fbfbfd"]);
  const color = useTransform(progress, [0.04, 0.3], ["#ffffff", "#0a0a0b"]);
  const bodyColor = useTransform(progress, [0.04, 0.3], ["rgba(255,255,255,0.6)", "rgba(29,29,31,0.72)"]);
  const titleOpacity = useTransform(progress, [0, 0.22], [0.25, 1]);
  const titleY = useTransform(progress, [0, 0.4], [60, 0]);
  const bodyOpacity = useTransform(progress, [0.4, 0.56], [0, 1]);
  const bodyY = useTransform(progress, [0.4, 0.56], [24, 0]);

  const photoY = useTransform(progress, [0.08, 0.62], ["55%", "0%"]);
  const photoClip = useTransform(progress, (v) => {
    const t = segment(v, 0.08, 0.62);
    return insetClip((1 - t) * 45, 0, 0, 0, 28);
  });
  const photoScale = useTransform(progress, [0.08, 1], [1.25, 1]);

  return (
    <m.section
      ref={ref}
      aria-labelledby="statement-titulo"
      style={{ backgroundColor: background }}
      data-header="dark"
      className="relative h-[220vh]"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="container-page relative grid h-full grid-rows-[auto_1fr] gap-8 pt-[calc(var(--header-height)+3rem)] pb-8 lg:grid-cols-12 lg:grid-rows-1 lg:items-center lg:gap-10 lg:py-0">
          <m.div style={{ color }} className="relative z-10 lg:col-span-7">
            <LogoMark className="size-9 text-accent" />
            <m.h2
              id="statement-titulo"
              style={{ opacity: titleOpacity, y: titleY }}
              className="mt-6 text-[clamp(2.125rem,1rem+3vw,4.25rem)] leading-[1.04] font-semibold tracking-[-0.04em] lg:mt-8"
            >
              <StatementTitle />
            </m.h2>
            <m.p style={{ opacity: bodyOpacity, y: bodyY, color: bodyColor }} className="text-lead mt-6 max-w-xl lg:mt-8">
              {statement.body}
            </m.p>
          </m.div>

          <div className="relative min-h-0 lg:col-span-5 lg:h-[72svh]">
            <m.div style={{ y: photoY, clipPath: photoClip }} className="absolute inset-0 overflow-hidden rounded-[1.75rem]">
              <m.div style={{ scale: photoScale }} className="absolute inset-0">
                <Photo photo={media.statement} sizes="(min-width: 1024px) 40vw, 100vw" />
              </m.div>
            </m.div>
          </div>
        </div>
      </div>
    </m.section>
  );
}

function StaticStatement() {
  return (
    <section aria-labelledby="statement-titulo" className="bg-paper py-28">
      <div className="container-page grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <LogoMark className="size-9 text-accent" />
          <h2 id="statement-titulo" className="text-headline mt-8 text-ink">
            <StatementTitle />
          </h2>
          <p className="text-lead mt-8 max-w-xl text-muted">{statement.body}</p>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] lg:col-span-5">
          <Photo photo={media.statement} sizes="(min-width: 1024px) 40vw, 100vw" />
        </div>
      </div>
    </section>
  );
}

/** A promessa em destaque; o complemento em tom mais baixo, na mesma linha de leitura. */
function StatementTitle() {
  const [first, ...rest] = statement.title.split(". ");
  return (
    <>
      {first}. <span className="opacity-40">{rest.join(". ")}</span>
    </>
  );
}
