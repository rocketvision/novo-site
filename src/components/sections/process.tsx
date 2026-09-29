"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { m, useSpring, useTransform, type MotionValue } from "motion/react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/animations/reveal";
import type { Resolved } from "@/lib/content/resolved";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { framingStyle, type Framing } from "@/lib/framing";
import { cn } from "@/lib/utils";

type Workflow = Resolved<"workflow">;
type Step = Workflow["steps"][number];

/**
 * Uma única fotografia para o caminho inteiro (uma escadaria que sobe em direção à luz),
 * espelhada para subir no sentido da leitura. Cada etapa enquadra o trecho seguinte:
 * a base na sombra, os degraus, a subida atravessando a luz e o topo iluminado.
 */
const PATH: Framing[] = [
  { x: 22, y: 80, scale: 1.6 },
  { x: 45, y: 66, scale: 1.6 },
  { x: 58, y: 40, scale: 1.5 },
  { x: 86, y: 18, scale: 1.6 },
];

/** Com outra quantidade de etapas, o percurso é distribuído entre o primeiro e o último enquadramento. */
function frameOf(index: number, total: number): Framing {
  if (total === PATH.length) return PATH[index];
  const t = total > 1 ? index / (total - 1) : 0;
  const [a, b] = [PATH[0], PATH[PATH.length - 1]];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, scale: a.scale + (b.scale - a.scale) * t };
}

/**
 * Como trabalhamos.
 * Desktop: a rolagem vertical conduz uma faixa horizontal de quadros (sem sequestrar o scroll),
 * com parallax dentro de cada quadro. Os quadros mostram trechos sucessivos da mesma fotografia.
 * Mobile e reduced motion: linha do tempo vertical com os mesmos enquadramentos.
 */
export function Process({ workflow }: { workflow: Workflow }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <section id="processo" aria-labelledby="processo-titulo" className="bg-mist">
      {reduceMotion ? (
        <VerticalProcess workflow={workflow} />
      ) : (
        // As duas composições saem do servidor; o CSS escolhe pelo breakpoint, sem salto após carregar.
        <>
          <div className="hidden lg:block">
            <HorizontalProcess workflow={workflow} />
          </div>
          <div className="lg:hidden">
            <VerticalProcess workflow={workflow} idSuffix="-m" />
          </div>
        </>
      )}
    </section>
  );
}

function Heading({ workflow, compact = false, idSuffix = "" }: { workflow: Workflow; compact?: boolean; idSuffix?: string }) {
  return (
    <div className={cn(compact ? "grid items-end gap-6 lg:grid-cols-12 lg:gap-12" : "max-w-3xl")}>
      <div className={cn(compact && "lg:col-span-7")}>
        <Eyebrow>{workflow.eyebrow}</Eyebrow>
        <h2
          id={`processo-titulo${idSuffix}`}
          className={cn(
            "mt-6 text-ink",
            compact ? "text-[clamp(2rem,0.8rem+2.6vw,3.75rem)] leading-[1.04] font-semibold tracking-[-0.04em]" : "text-headline",
          )}
        >
          {workflow.title}
        </h2>
      </div>
      <p className={cn("text-lead text-muted", compact ? "lg:col-span-4 lg:col-start-9 lg:pb-2" : "mt-6 max-w-2xl")}>
        {workflow.lead}
      </p>
    </div>
  );
}

function HorizontalProcess({ workflow }: { workflow: Workflow }) {
  const total = workflow.steps.length;
  const sectionRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const [distance, setDistance] = useState(0);

  // Distância horizontal que a faixa precisa percorrer para mostrar a última etapa.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const measure = () => setDistance(Math.max(0, track.offsetWidth - viewport.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const scrollYProgress = useScrollProgress(sectionRef, ["start start", "end end"]);
  const x = useTransform(scrollYProgress, [0.06, 0.94], [0, -distance]);
  const progress = useSpring(useTransform(scrollYProgress, [0.06, 0.94], [0, 1]), { stiffness: 120, damping: 30 });

  return (
    // Altura proporcional ao número de etapas: com as 4 originais, 360vh.
    <div ref={sectionRef} style={{ height: `${Math.round((total * 360) / 4)}vh` }} className="relative">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden pt-(--header-height)">
        <div className="container-page">
          <Heading workflow={workflow} compact />

          <div className="relative mt-8 flex h-px items-center bg-black/10" aria-hidden="true">
            <m.div style={{ scaleX: progress }} className="absolute inset-0 origin-left bg-ink" />
          </div>
        </div>

        <div ref={viewportRef} className="container-page mt-7">
          <m.ol ref={trackRef} style={{ x }} className="flex w-max gap-8 will-change-transform">
            {workflow.steps.map((step, i) => (
              <StepFrame key={i} step={step} index={i} total={total} progress={progress} photo={workflow.image} />
            ))}
          </m.ol>
        </div>
      </div>
    </div>
  );
}

function StepFrame({
  step,
  index,
  total,
  progress,
  photo,
}: {
  step: Step;
  index: number;
  total: number;
  progress: MotionValue<number>;
  photo: Workflow["image"];
}) {
  // A etapa ganha destaque quando o progresso chega à sua posição na faixa.
  const center = index / (total - 1);
  const focus = useTransform(progress, [center - 0.36, center - 0.08, center + 0.08, center + 0.36], [0, 1, 1, 0]);
  const opacity = useTransform(focus, [0, 1], [0.45, 1]);
  const frameScale = useTransform(focus, [0, 1], [0.94, 1]);
  // Parallax dentro do quadro: a foto anda mais devagar que a faixa.
  const photoX = useTransform(progress, [0, 1], ["7%", "-7%"]);

  return (
    <m.li style={{ opacity }} className="w-[min(34rem,36vw)] shrink-0">
      <m.div
        style={{ scale: frameScale }}
        className="relative h-[clamp(11rem,32svh,22rem)] origin-bottom-left overflow-hidden rounded-[1.5rem]"
      >
        <m.div style={{ x: photoX }} className="absolute -inset-x-[14%] inset-y-0">
          <Photo photo={photo} sizes="40vw" decorative style={framingStyle(frameOf(index, total), true)} />
        </m.div>
        <span className="absolute top-5 left-6 font-mono text-xs text-white tabular-nums mix-blend-difference">
          {String(index + 1).padStart(2, "0")}
        </span>
      </m.div>
      <p className="text-eyebrow mt-5 text-accent-strong">{step.name}</p>
      <h3 className="mt-3 max-w-md text-[clamp(1.375rem,1rem+1vw,2rem)] leading-tight font-semibold tracking-[-0.03em] text-ink">{step.title}</h3>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted">{step.body}</p>
    </m.li>
  );
}

function VerticalProcess({ workflow, idSuffix = "" }: { workflow: Workflow; idSuffix?: string }) {
  const listRef = useRef<HTMLOListElement>(null);
  const scrollYProgress = useScrollProgress(listRef, ["start center", "end center"]);

  return (
    <div className="container-page py-24 md:py-32">
      <Heading workflow={workflow} idSuffix={idSuffix} />
      <ol ref={listRef} className="relative mt-14 space-y-16 pl-10 md:pl-14">
        <span aria-hidden="true" className="absolute top-2 bottom-2 left-[0.3125rem] w-px bg-black/10">
          <m.span style={{ scaleY: scrollYProgress }} className="absolute inset-0 origin-top bg-ink" />
        </span>
        {workflow.steps.map((step, i) => (
          <li key={i} className="relative">
            <span aria-hidden="true" className="absolute top-1.5 -left-10 size-2.5 rounded-full bg-accent ring-4 ring-mist md:-left-14" />
            <p className="text-eyebrow text-muted">
              <span className="text-ink tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="mx-2 text-black/20">/</span>
              {step.name}
            </p>
            <h3 className="text-title mt-3 text-ink">{step.title}</h3>
            <p className="text-body mt-3 max-w-xl text-muted">{step.body}</p>
            <Reveal className="relative mt-6 aspect-[16/10] overflow-hidden rounded-[1.25rem]">
              <Photo photo={workflow.image} sizes="100vw" decorative style={framingStyle(frameOf(i, workflow.steps.length), true)} />
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}
