"use client";

import { useRef } from "react";
import { Reveal } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LogoMark } from "@/components/ui/logo";
import type { Resolved } from "@/lib/content/resolved";
import { useMediaQuery, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { gsap, MotionPathPlugin, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type Workflow = Resolved<"workflow">;

/**
 * O caminho, em coordenadas do SVG. Sobe da esquerda para a direita no desktop
 * e de baixo para cima, em zigue-zague, no celular. O SVG mantém a proporção (sem esticar o traço);
 * as etapas são posicionadas a partir das coordenadas do caminho na tela.
 * `stroke` é a espessura em unidades do SVG, para dar cerca de 3 px na tela em cada formato.
 */
const ROUTES = {
  wide: {
    w: 1000,
    h: 500,
    stroke: 3,
    d: "M 20 470 C 170 470 210 380 330 350 S 520 300 610 250 S 790 170 870 110 S 960 40 1010 -10",
  },
  tall: {
    w: 400,
    h: 1000,
    stroke: 5.5,
    d: "M 70 1010 C 70 860 330 840 330 690 S 70 520 70 380 S 330 200 330 60 L 330 -20",
  },
} as const;

/** Onde cada etapa fica no caminho (0 a 1), com folga no começo e no fim. */
const stopOf = (i: number, total: number) => (total > 1 ? 0.1 + (0.72 * i) / (total - 1) : 0.5);

/**
 * Como trabalhamos.
 * A seção fica presa e o scroll desenha o caminho em laranja. O foguete da marca percorre o traço
 * e cada etapa acende quando ele passa por ela. No fim, o foguete decola para fora da tela.
 */
export function Process({ workflow }: { workflow: Workflow }) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <section id="processo" aria-labelledby="processo-titulo" className="bg-mist">
      {reduceMotion ? <StaticProcess workflow={workflow} /> : <RocketPath workflow={workflow} />}
    </section>
  );
}

function Heading({ workflow }: { workflow: Workflow }) {
  return (
    <div className="grid items-end gap-4 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <Eyebrow>{workflow.eyebrow}</Eyebrow>
        <h2 id="processo-titulo" className="mt-4 text-[clamp(1.875rem,0.8rem+2.4vw,3.5rem)] leading-[1.04] font-semibold tracking-[-0.04em] text-ink">
          {workflow.title}
        </h2>
      </div>
      <p className="text-body text-muted max-lg:hidden lg:col-span-4 lg:col-start-9 lg:pb-1.5">{workflow.lead}</p>
    </div>
  );
}

function RocketPath({ workflow }: { workflow: Workflow }) {
  const ref = useRef<HTMLDivElement>(null);
  const wide = useMediaQuery("(min-width: 768px)", true);
  const route = wide ? ROUTES.wide : ROUTES.tall;
  const total = workflow.steps.length;

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const path = q<SVGPathElement>("[data-route]")[0];
      const rocket = q("[data-rocket]")[0];
      if (!path || !rocket) return;

      // Posiciona cada etapa sobre o ponto certo do caminho, convertido para a tela.
      const raw = MotionPathPlugin.getRawPath(path);
      MotionPathPlugin.cacheRawPathMeasurements(raw);
      const stops = q("[data-stop]");
      const place = () => {
        const stage = path.ownerSVGElement?.parentElement;
        const matrix = path.getScreenCTM();
        if (!stage || !matrix) return;
        const box = stage.getBoundingClientRect();
        stops.forEach((stop, i) => {
          const p = MotionPathPlugin.getPositionOnPath(raw, stopOf(i, total));
          const x = matrix.a * p.x + matrix.c * p.y + matrix.e - box.left;
          const y = matrix.b * p.x + matrix.d * p.y + matrix.f - box.top;
          gsap.set(stop, { left: x, top: y });
          // O texto fica do lado com mais espaço: acima ou abaixo no desktop, à esquerda ou à direita no celular.
          const side = wide ? (y > box.height / 2 ? "above" : "below") : x < box.width / 2 ? "right" : "left";
          stop.dataset.side = side;
          // No celular, a largura do texto é o espaço que sobra ao lado do ponto.
          const room = (side === "right" ? box.width - x : x) - 28;
          gsap.set(stop.querySelector("[data-label]"), { width: wide ? "" : Math.min(256, room) });
        });
      };
      place();

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ref.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
          onRefresh: place,
        },
      });
      const travel = 0.9;
      tl.fromTo(path, { drawSVG: "0%" }, { drawSVG: "100%", duration: travel }, 0).to(
        rocket,
        {
          motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
          duration: travel,
        },
        0,
      );

      stops.forEach((stop, i) => {
        const at = stopOf(i, total) * travel;
        tl.fromTo(
          stop.querySelector("[data-dot]"),
          { scale: 0.4, backgroundColor: "#d4d4d8" },
          {
            scale: 1,
            backgroundColor: "#ff5b1f",
            duration: 0.03,
            ease: "back.out(3)",
          },
          at,
        ).fromTo(
          stop.querySelector("[data-card]"),
          { autoAlpha: 0, y: 24, scale: 0.96 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.06, ease: "power2.out" },
          at,
        );
      });

      // Chegada: o foguete acelera e sai da tela.
      tl.to(
        rocket,
        {
          scale: 0.5,
          opacity: 0,
          x: "+=12vw",
          y: "-=18vh",
          duration: 1 - travel,
          ease: "power2.in",
        },
        travel,
      );
    },
    { scope: ref, dependencies: [wide, total], revertOnUpdate: true },
  );

  return (
    // Altura proporcional ao número de etapas: com as 4 originais, 400vh.
    <div ref={ref} style={{ height: `${Math.round(total * 100)}vh` }} className="relative">
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden pt-[calc(var(--header-height)+1.5rem)] pb-8">
        <div className="container-page">
          <Heading workflow={workflow} />
        </div>

        <div className="container-page relative mt-6 flex-1">
          <div className="relative size-full">
            <svg viewBox={`0 0 ${route.w} ${route.h}`} className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
              <path
                d={route.d}
                fill="none"
                stroke="rgb(0 0 0 / 0.1)"
                strokeWidth={route.stroke / 2}
                strokeDasharray={`${route.stroke * 0.7} ${route.stroke * 2.7}`}
                strokeLinecap="round"
              />
              <path data-route d={route.d} fill="none" stroke="var(--color-accent)" strokeWidth={route.stroke} strokeLinecap="round" />
            </svg>

            <ol>
              {workflow.steps.map((step, i) => (
                <li key={i} data-stop className="group absolute size-0">
                  <span data-dot aria-hidden="true" className="absolute top-0 left-0 size-4 -translate-1/2 rounded-full bg-zinc-300 ring-[6px] ring-mist" />
                  {/* O invólucro posiciona (translate do CSS); o cartão dentro dele é o que o GSAP anima. */}
                  <div
                    data-label
                    className={cn(
                      "absolute w-[min(16rem,58vw)]",
                      "group-data-[side=above]:bottom-6 group-data-[side=above]:left-0 group-data-[side=above]:-translate-x-1/2",
                      "group-data-[side=below]:top-6 group-data-[side=below]:left-0 group-data-[side=below]:-translate-x-1/2",
                      "group-data-[side=right]:top-0 group-data-[side=right]:left-6 group-data-[side=right]:-translate-y-1/2",
                      "group-data-[side=left]:top-0 group-data-[side=left]:right-6 group-data-[side=left]:-translate-y-1/2 group-data-[side=left]:text-right",
                    )}
                  >
                    <div data-card className="invisible">
                      <p className="text-eyebrow text-accent-strong">
                        {String(i + 1).padStart(2, "0")} · {step.name}
                      </p>
                      <h3 className="mt-2 text-lg leading-snug font-semibold tracking-tight text-ink md:text-xl">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted max-md:hidden">{step.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div
              data-rocket
              aria-hidden="true"
              className="absolute top-0 left-0 grid size-14 place-items-center rounded-full bg-ink text-accent shadow-[0_18px_40px_-12px_rgb(255_91_31/0.6)]"
            >
              <LogoMark className="size-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaticProcess({ workflow }: { workflow: Workflow }) {
  return (
    <div className="container-page py-24 md:py-32">
      <Heading workflow={workflow} />
      <ol className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        {workflow.steps.map((step, i) => (
          <Reveal as="li" key={i} className="border-t border-black/10 pt-6">
            <p className="text-eyebrow text-accent-strong">
              {String(i + 1).padStart(2, "0")} · {step.name}
            </p>
            <h3 className="mt-3 text-xl leading-snug font-semibold tracking-tight text-ink xl:text-2xl">{step.title}</h3>
            <p className="text-body mt-3 text-muted">{step.body}</p>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}
