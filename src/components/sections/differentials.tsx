"use client";

import { useEffect, useRef, useState } from "react";
import { m, useTransform } from "motion/react";
import { Reveal } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassIllustration, type GlyphName } from "@/components/visuals/illustrations";
import { Stage } from "@/components/visuals/primitives";
import type { Resolved } from "@/lib/content/resolved";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { transition } from "@/lib/motion";

/** Uma ilustração por compromisso, na ordem da copy. */
const GLYPHS: GlyphName[] = ["talk", "scope", "craft", "shield", "grow"];
const glyphOf = (i: number) => GLYPHS[i] ?? "scope";

/**
 * Diferenciais em composição editorial: o painel fica fixo e sangra pela
 * borda esquerda enquanto os compromissos passam ao lado dele.
 * No desktop, o painel mostra a ilustração do compromisso que está no centro da tela;
 * no mobile, as ilustrações aparecem juntas acima da lista.
 */
export function Differentials({ differentials }: { differentials: Resolved<"differentials"> }) {
  const ref = useRef<HTMLElement>(null);
  const progress = useScrollProgress(ref, ["start end", "end start"]);
  const scale = useTransform(progress, [0, 1], [1.2, 1]);
  const y = useTransform(progress, [0, 1], ["-6%", "6%"]);
  const listRef = useRef<HTMLUListElement>(null);
  const active = useCenteredItem(listRef);
  const count = differentials.items.length;

  return (
    <section
      ref={ref}
      id="diferenciais"
      aria-labelledby="diferenciais-titulo"
      className="relative bg-paper py-24 md:py-32 lg:py-0"
    >
      <div className="lg:grid lg:grid-cols-[44vw_1fr]">
        <div className="relative mb-14 lg:mb-0">
          <div className="relative mx-4 aspect-[4/3] overflow-hidden rounded-[1.5rem] sm:mx-8 lg:sticky lg:top-0 lg:mx-0 lg:aspect-auto lg:h-svh lg:rounded-none lg:rounded-r-[2rem]">
            <m.div style={{ scale, y }} className="absolute inset-0">
              <IllustrationPanel active={active} count={count} />
            </m.div>
          </div>
        </div>

        <div className="container-page lg:max-w-none lg:py-40 lg:pr-[max(3rem,calc((100vw-80rem)/2+3rem))] lg:pl-20">
          <Reveal className="max-w-2xl">
            <Eyebrow>{differentials.eyebrow}</Eyebrow>
            <h2 id="diferenciais-titulo" className="text-headline mt-6 text-ink">
              {differentials.title}
            </h2>
          </Reveal>

          <ul ref={listRef} className="mt-16 lg:mt-24">
            {differentials.items.map((item, i) => (
              <Reveal as="li" key={i} className="group border-t border-line py-9 last:border-b lg:py-12">
                <div className="flex gap-6">
                  <span aria-hidden="true" className="text-eyebrow w-6 shrink-0 pt-2.5 text-subtle tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-title text-ink transition-transform duration-500 ease-out group-hover:translate-x-1">
                      {item.title}
                    </h3>
                    <p className="text-body mt-3 max-w-lg text-muted">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Índice do item da lista cujo centro está mais perto do centro da tela. */
function useCenteredItem(listRef: React.RefObject<HTMLUListElement | null>) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const items = listRef.current?.children;
      if (!items) return;
      const middle = window.innerHeight / 2;
      let best = 0;
      let bestDistance = Infinity;
      Array.from(items).forEach((item, i) => {
        const rect = item.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - middle);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [listRef]);
  return active;
}

function IllustrationPanel({ active, count }: { active: number; count: number }) {
  return (
    <div className="absolute inset-0 bg-mist">
      {/* Desktop: a ilustração troca junto com o compromisso ao lado. */}
      <div className="absolute inset-0 hidden lg:block">
        <Stage size={[2.4, 2]}>
          <div className="relative size-[24em]">
            {Array.from({ length: count }).map((_, i) => (
              <m.div
                key={i}
                initial={false}
                animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1 : 0.9, y: i === active ? "0em" : i < active ? "-3em" : "3em" }}
                transition={transition.swap}
                className="absolute inset-0 flex items-center justify-center"
              >
                <GlassIllustration name={glyphOf(i)} />
              </m.div>
            ))}
          </div>
        </Stage>
      </div>
      {/* Mobile: os compromissos juntos, antes da lista. */}
      <div className="absolute inset-0 lg:hidden">
        <Stage size={[2.4, 3.2]}>
          <div className="flex w-[34em] flex-wrap justify-center gap-x-[1em] gap-y-[0.6em]">
            {Array.from({ length: Math.min(count, GLYPHS.length) }).map((_, i) => (
              <div key={i} className="text-[0.62em]">
                <GlassIllustration name={glyphOf(i)} />
              </div>
            ))}
          </div>
        </Stage>
      </div>
    </div>
  );
}
