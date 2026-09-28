"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { m, useSpring, useTransform, type MotionValue } from "motion/react";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { Eyebrow } from "@/components/ui/eyebrow";
import { workflow } from "@/content/landing";
import { useMediaQuery, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type Step = (typeof workflow.steps)[number];

/**
 * Como trabalhamos.
 * Desktop: a rolagem vertical conduz um trilho horizontal com as etapas (sem sequestrar o scroll).
 * Mobile e reduced motion: linha do tempo vertical que se preenche conforme o avanço.
 */
export function Process() {
  const isDesktop = useMediaQuery("(min-width: 1024px)", false);
  const reduceMotion = usePrefersReducedMotion();

  return (
    <section id="processo" aria-labelledby="processo-titulo" className="bg-mist">
      {isDesktop && !reduceMotion ? <HorizontalProcess /> : <VerticalProcess />}
    </section>
  );
}

function Heading({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn(compact ? "grid items-end gap-6 lg:grid-cols-12 lg:gap-12" : "max-w-3xl")}>
      <div className={cn(compact && "lg:col-span-7")}>
        <Eyebrow>{workflow.eyebrow}</Eyebrow>
        <h2 id="processo-titulo" className="text-headline mt-6 text-ink">
          {workflow.title}
        </h2>
      </div>
      <p className={cn("text-lead text-muted", compact ? "lg:col-span-5 lg:pb-2" : "mt-6 max-w-2xl")}>{workflow.lead}</p>
    </div>
  );
}

function HorizontalProcess() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const [distance, setDistance] = useState(0);

  // Distância horizontal que o trilho precisa percorrer para mostrar a última etapa.
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
  const x = useTransform(scrollYProgress, [0.08, 0.92], [0, -distance]);
  const progress = useSpring(useTransform(scrollYProgress, [0.08, 0.92], [0, 1]), { stiffness: 120, damping: 30 });

  return (
    <div ref={sectionRef} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden pt-(--header-height)">
        <div className="container-page">
          <Heading compact />

          <div className="relative mt-10 h-px bg-black/10 xl:mt-14" aria-hidden="true">
            <m.div style={{ scaleX: progress }} className="absolute inset-0 origin-left bg-ink" />
          </div>

          <div ref={viewportRef} className="mt-8 xl:mt-10">
            <m.ol ref={trackRef} style={{ x }} className="flex w-max gap-6 will-change-transform">
              {workflow.steps.map((step, i) => (
                <StepPanel key={step.name} step={step} index={i} progress={progress} total={workflow.steps.length} />
              ))}
            </m.ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepPanel({
  step,
  index,
  total,
  progress,
}: {
  step: Step;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  // Cada etapa ganha destaque quando o progresso alcança sua posição no trilho.
  const center = index / (total - 1);
  const opacity = useTransform(progress, [center - 0.4, center - 0.1, center + 0.1, center + 0.4], [0.35, 1, 1, 0.35]);

  return (
    <m.li
      style={{ opacity }}
      className="flex w-[min(32rem,38vw)] shrink-0 flex-col rounded-[1.75rem] bg-white p-8 ring-1 ring-black/[0.04] xl:p-10"
    >
      <span className="text-[3.5rem] leading-none font-semibold tracking-[-0.06em] text-black/[0.08] tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <p className="text-eyebrow mt-6 text-accent-strong">{step.name}</p>
      <h3 className="text-title mt-4 text-ink">{step.title}</h3>
      <p className="text-body mt-4 text-muted">{step.body}</p>
    </m.li>
  );
}

function VerticalProcess() {
  const listRef = useRef<HTMLOListElement>(null);
  const scrollYProgress = useScrollProgress(listRef, ["start center", "end center"]);

  return (
    <div className="container-page py-24 md:py-32">
      <Heading />
      <ol ref={listRef} className="relative mt-14 space-y-12 pl-10 md:pl-14">
        <span aria-hidden="true" className="absolute top-2 bottom-2 left-[0.3125rem] w-px bg-black/10">
          <m.span style={{ scaleY: scrollYProgress }} className="absolute inset-0 origin-top bg-ink" />
        </span>
        {workflow.steps.map((step, i) => (
          <li key={step.name} className="relative">
            <span aria-hidden="true" className="absolute top-1.5 -left-10 size-2.5 rounded-full bg-accent ring-4 ring-mist md:-left-14" />
            <p className="text-eyebrow text-muted">
              <span className="text-ink tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="mx-2 text-black/20">/</span>
              {step.name}
            </p>
            <h3 className="text-title mt-3 text-ink">{step.title}</h3>
            <p className="text-body mt-3 max-w-xl text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
