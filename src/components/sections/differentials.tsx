"use client";

import { useRef } from "react";
import { Reveal } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { Resolved } from "@/lib/content/resolved";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

type Content = Resolved<"differentials">;

const pad = (n: number) => String(n + 1).padStart(2, "0");

/** Onde a luz em brasa pousa em cada capítulo (em % da tela): ela anda junto com a leitura. */
const GLOW = [
  { x: 72, y: 38 },
  { x: 28, y: 64 },
  { x: 78, y: 70 },
  { x: 36, y: 30 },
  { x: 64, y: 52 },
];

/**
 * Por que a Rocket, em capítulos de tela cheia.
 * A seção fica presa enquanto cada compromisso ocupa a tela: o título sobe palavra por palavra
 * por trás de uma máscara, o número gigante desliza ao fundo, a luz em brasa muda de lugar
 * e o anel da marca gira com o scroll. Sem fotografia: tipografia, luz e movimento.
 */
export function Differentials({ differentials }: { differentials: Content }) {
  const reduceMotion = usePrefersReducedMotion();
  return reduceMotion ? <StaticDifferentials differentials={differentials} /> : <Chapters differentials={differentials} />;
}

function Chapters({ differentials }: { differentials: Content }) {
  const ref = useRef<HTMLElement>(null);
  const items = differentials.items;
  const total = items.length;

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const chapters = q("[data-chapter]");
      const splits = chapters.map((chapter) => SplitText.create(chapter.querySelector("h3"), { type: "words", mask: "words" }));
      const dots = q("[data-dot]");

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });

      // O anel da marca gira devagar durante toda a seção.
      tl.to(q("[data-ring]"), { rotation: 200, ease: "none", duration: total }, 0);

      chapters.forEach((chapter, i) => {
        const at = i;
        const words = splits[i].words;
        const number = chapter.querySelector("[data-number]");
        const body = chapter.querySelector("[data-body]");
        const glow = GLOW[i % GLOW.length];

        tl.set(chapter, { autoAlpha: 1 }, at)
          .fromTo(words, { yPercent: 115 }, { yPercent: 0, stagger: 0.035, duration: 0.3 }, at)
          .fromTo(number, { xPercent: 18, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.45 }, at)
          .fromTo(body, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25 }, at + 0.15)
          .to(q("[data-glow]"), { left: `${glow.x}%`, top: `${glow.y}%`, duration: 0.5, ease: "power2.inOut" }, at)
          .to(dots, { scaleX: (j: number) => (j === i ? 1 : 0.3), backgroundColor: (j: number) => (j === i ? "#ff5b1f" : "rgba(255,255,255,0.25)"), duration: 0.2 }, at);

        if (i < total - 1) {
          tl.to(words, { yPercent: -115, stagger: 0.02, duration: 0.25, ease: "power2.in" }, at + 0.72)
            .to(number, { xPercent: -14, opacity: 0, duration: 0.3, ease: "power2.in" }, at + 0.7)
            .to(body, { y: -24, opacity: 0, duration: 0.2, ease: "power2.in" }, at + 0.72)
            .set(chapter, { autoAlpha: 0 }, at + 1);
        }
      });

      return () => splits.forEach((s) => s.revert());
    },
    { scope: ref, dependencies: [total] },
  );

  return (
    <section
      ref={ref}
      id="diferenciais"
      aria-labelledby="diferenciais-titulo"
      data-header="dark"
      style={{ height: `${(total + 1) * 90}vh` }}
      className="relative bg-ink text-white"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* Luz em brasa que muda de lugar a cada capítulo. */}
        <div
          data-glow
          aria-hidden="true"
          className="absolute top-[38%] left-[72%] size-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.34),rgb(255_91_31/0.08)_55%,transparent)] blur-2xl"
        />
        {/* O anel da marca, gigante, girando com o scroll. */}
        <svg
          data-ring
          aria-hidden="true"
          viewBox="0 0 32 32"
          fill="none"
          className="absolute top-1/2 left-1/2 size-[130vmin] -translate-x-1/2 -translate-y-1/2 text-white/[0.06]"
        >
          <path d="M29.16 11.21A14 14 0 0 1 11.21 29.16M2.84 20.79A14 14 0 0 1 20.79 2.84" stroke="currentColor" strokeWidth="0.12" strokeLinecap="round" />
        </svg>

        <div className="container-page relative flex h-full flex-col pt-[calc(var(--header-height)+2.5rem)] pb-10">
          <div className="max-w-xl">
            <Eyebrow className="text-white/55">{differentials.eyebrow}</Eyebrow>
            <h2 id="diferenciais-titulo" className="mt-4 text-lg leading-snug font-medium tracking-tight text-white/60 md:text-xl">
              {differentials.title}
            </h2>
          </div>

          <ol className="relative flex-1">
            {items.map((item, i) => (
              <li key={i} data-chapter className="invisible absolute inset-0 flex flex-col justify-center">
                <span
                  data-number
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 bottom-0 text-[clamp(9rem,26vw,24rem)] leading-[0.8] font-bold tracking-[-0.06em] text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/0.16)] max-md:bottom-auto max-md:top-4"
                >
                  {pad(i)}
                </span>
                <p className="font-mono text-xs text-accent tabular-nums">
                  {pad(i)} <span className="text-white/35">/ {pad(total - 1)}</span>
                </p>
                <h3 className="relative mt-5 max-w-5xl text-[clamp(2.5rem,1rem+4.8vw,6.75rem)] leading-[1] font-semibold tracking-[-0.045em]">
                  {item.title}
                </h3>
                <p data-body className="text-lead relative mt-8 max-w-xl text-white/60">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="flex gap-2" aria-hidden="true">
            {items.map((_, i) => (
              <span key={i} data-dot className="h-0.5 w-10 origin-left scale-x-[0.3] rounded-full bg-white/25" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StaticDifferentials({ differentials }: { differentials: Content }) {
  return (
    <section id="diferenciais" aria-labelledby="diferenciais-titulo" data-header="dark" className="bg-ink py-28 text-white md:py-36">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <Eyebrow className="text-white/55">{differentials.eyebrow}</Eyebrow>
          <h2 id="diferenciais-titulo" className="text-headline mt-6">
            {differentials.title}
          </h2>
        </Reveal>
        <ol className="mt-16">
          {differentials.items.map((item, i) => (
            <li key={i} className="border-t border-white/10 py-10 last:border-b">
              <p className="font-mono text-xs text-accent tabular-nums">{pad(i)}</p>
              <h3 className="text-title mt-4">{item.title}</h3>
              <p className="text-body mt-3 max-w-xl text-white/60">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
