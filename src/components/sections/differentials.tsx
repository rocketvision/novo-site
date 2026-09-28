"use client";

import { useRef } from "react";
import { m, useTransform } from "motion/react";
import { Reveal } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Photo } from "@/components/ui/photo";
import { differentials } from "@/content/landing";
import { media } from "@/content/media";
import { useScrollProgress } from "@/hooks/use-scroll-progress";

/**
 * Diferenciais em composição editorial: a fotografia fica fixa e sangra pela
 * borda esquerda enquanto os compromissos passam ao lado dela.
 */
export function Differentials() {
  const ref = useRef<HTMLElement>(null);
  const progress = useScrollProgress(ref, ["start end", "end start"]);
  const scale = useTransform(progress, [0, 1], [1.2, 1]);
  const y = useTransform(progress, [0, 1], ["-6%", "6%"]);

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
              <Photo photo={media.differentials} sizes="(min-width: 1024px) 44vw, 100vw" />
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

          <ul className="mt-16 lg:mt-24">
            {differentials.items.map((item, i) => (
              <Reveal as="li" key={item.title} className="group border-t border-line py-9 last:border-b lg:py-12">
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
