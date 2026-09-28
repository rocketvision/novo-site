"use client";

import { m, useTransform, type MotionValue } from "motion/react";
import { FileSpreadsheet, Search } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { problem } from "@/content/landing";
import { cn } from "@/lib/utils";

type Symptom = (typeof problem.symptoms)[number];

/**
 * Posição de cada improviso na cena. Os objetos caem espalhados,
 * cada um com sua inclinação, como papéis sobre uma mesa bagunçada.
 */
const layout = [
  // Mobile: duas colunas na parte de cima, a conclusão fica embaixo. Desktop: nos quatro cantos.
  { className: "left-[3%] top-[10%] lg:left-[7%] lg:top-[20%]", rotate: -6, drift: -40 },
  { className: "right-[3%] top-[21%] lg:right-[8%] lg:top-[16%]", rotate: 5, drift: -70 },
  { className: "left-[4%] top-[39%] lg:top-auto lg:left-[12%] lg:bottom-[14%]", rotate: 4, drift: -20 },
  { className: "right-[4%] top-[48%] lg:top-auto lg:right-[13%] lg:bottom-[17%]", rotate: -4, drift: -55 },
];

/**
 * O problema, contado com objetos em vez de parágrafos.
 * Conforme o scroll avança, os improvisos da operação caem um a um sobre a foto escura
 * e, no centro, aparece a conclusão. No fim, tudo se apaga para a próxima seção.
 */
export function ProblemChaos({ progress, start = 0.46 }: { progress: MotionValue<number>; start?: number }) {
  const eyebrowOpacity = useTransform(progress, [start, start + 0.05], [0, 1]);
  const conclusionOpacity = useTransform(progress, [start + 0.3, start + 0.38], [0, 1]);
  const conclusionY = useTransform(progress, [start + 0.3, start + 0.4], [24, 0]);
  const exit = useTransform(progress, [0.93, 1], [1, 0]);

  return (
    <m.div style={{ opacity: exit }} className="pointer-events-none absolute inset-0">
      <h2 className="sr-only">
        {problem.eyebrow} {problem.manifesto}
      </h2>

      {problem.symptoms.map((symptom, i) => (
        <Artifact key={symptom.kind} symptom={symptom} index={i} progress={progress} start={start} />
      ))}

      <div className="absolute inset-0 flex items-end justify-center px-6 pb-[12svh] lg:items-center lg:pb-0" aria-hidden="true">
        <div className="max-w-xl text-center">
          <m.div style={{ opacity: eyebrowOpacity }}>
            <Eyebrow className="text-white/55">{problem.eyebrow}</Eyebrow>
          </m.div>
          <m.p
            style={{ opacity: conclusionOpacity, y: conclusionY }}
            className="mt-4 text-[clamp(1.75rem,1rem+2.2vw,3rem)] leading-[1.08] font-semibold tracking-[-0.035em] text-white"
          >
            {problem.conclusion[0]}
            <br />
            <span className="text-accent">{problem.conclusion[1]}</span>
          </m.p>
        </div>
      </div>
    </m.div>
  );
}

function Artifact({
  symptom,
  index,
  progress,
  start,
}: {
  symptom: Symptom;
  index: number;
  progress: MotionValue<number>;
  start: number;
}) {
  const { className, rotate, drift } = layout[index];
  const from = start + 0.02 + index * 0.065;
  const to = from + 0.09;

  // Cai de um pouco mais alto, girando mais, e assenta na posição final.
  const opacity = useTransform(progress, [from, from + 0.04], [0, 1]);
  const y = useTransform(progress, [from, to, 1], [90, 0, drift]);
  const scale = useTransform(progress, [from, to], [1.12, 1]);
  const rotation = useTransform(progress, [from, to], [rotate * 3, rotate]);
  // Quando a conclusão aparece, os objetos recuam para o fundo.
  const dim = useTransform(progress, [start + 0.3, start + 0.4], [1, 0.45]);

  return (
    <m.figure
      aria-hidden="true"
      style={{ opacity, y, scale, rotate: rotation }}
      className={cn("absolute w-[min(44vw,17rem)] lg:w-[19rem]", className)}
    >
      <m.div style={{ opacity: dim }}>
        <ArtifactBody symptom={symptom} />
        <figcaption className="mt-3 text-xs leading-snug font-medium text-white/80 lg:text-sm">{symptom.text}</figcaption>
      </m.div>
    </m.figure>
  );
}

const shadow = "shadow-[0_30px_60px_-20px_rgb(0_0_0/0.7)]";

function ArtifactBody({ symptom }: { symptom: Symptom }) {
  switch (symptom.kind) {
    case "file":
      return (
        <div className={cn("rounded-2xl bg-white p-3.5 lg:p-4", shadow)}>
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white lg:size-10">
              <FileSpreadsheet className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-[0.6875rem] font-medium text-ink lg:text-xs">{symptom.artifact}</p>
              <p className="mt-0.5 text-[0.625rem] text-muted lg:text-[0.6875rem]">{symptom.meta}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-px overflow-hidden rounded-md bg-black/10" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className={cn("h-3 bg-white", i === 6 && "bg-red-100", i === 9 && "bg-amber-100")} />
            ))}
          </div>
        </div>
      );
    case "chat":
      return (
        <div className={cn("rounded-2xl bg-[#1f2c34] p-3 lg:p-3.5", shadow)}>
          <div className="relative rounded-xl rounded-tl-sm bg-[#2a3942] px-3 py-2.5">
            <p className="text-[0.8125rem] leading-snug text-white/90 lg:text-sm">{symptom.artifact}</p>
            <p className="mt-1 text-right text-[0.625rem] text-white/45">09:14</p>
          </div>
          <p className="mt-2.5 flex items-center gap-2 text-[0.6875rem] text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            {symptom.meta}
          </p>
        </div>
      );
    case "search":
      return (
        <div className={cn("rounded-2xl bg-white p-3.5 lg:p-4", shadow)}>
          <div className="flex items-center gap-2.5 rounded-full bg-mist px-3.5 py-2">
            <Search className="size-3.5 text-muted" />
            <span className="text-[0.8125rem] text-ink">{symptom.artifact}</span>
          </div>
          <div className="mt-3 space-y-2" aria-hidden="true">
            <span className="block h-2 w-4/5 rounded-full bg-black/[0.08]" />
            <span className="block h-2 w-3/5 rounded-full bg-black/[0.06]" />
          </div>
          <p className="mt-3 text-[0.6875rem] text-muted">{symptom.meta}</p>
        </div>
      );
    case "note":
      return (
        <div className={cn("bg-[#fde68a] px-4 pt-5 pb-6 lg:px-5", shadow)}>
          <p className="text-[0.9375rem] leading-snug font-medium text-[#3b2f0b] italic lg:text-base">{symptom.artifact}</p>
        </div>
      );
  }
}
