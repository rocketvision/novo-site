"use client";

import { useRef } from "react";
import { m, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { PublicProject as Project } from "@/lib/projects/types";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { lerp, segment } from "@/lib/scroll";
import { readableAccent } from "@/lib/projects/color";
import { cn } from "@/lib/utils";
import { BrowserFrame, PhoneFrame } from "./devices";

const pad = (n: number) => String(n).padStart(2, "0");
/** Quanto do trecho de cada projeto ele fica parado antes do próximo começar a subir. */
const HOLD = 0.3;
/** Altura de scroll dedicada a cada projeto, em svh. */
const SLOT = 110;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Pilha de projetos em tela cheia.
 * Cada projeto sobe por cima do anterior como um cartão; o de baixo recua e escurece.
 * Dentro do cartão, as telas chegam em camadas (o celular mais rápido que o navegador),
 * como numa foto de produto que ganha profundidade.
 */
export function ProjectStack({ projects }: { projects: Project[] }) {
  const reduceMotion = usePrefersReducedMotion();
  if (reduceMotion) {
    return (
      <div className="space-y-3 px-2 md:px-3">
        {projects.map((project, i) => (
          <div key={project.slug} id={`projeto-${project.slug}`} className="relative h-svh overflow-hidden rounded-[1.75rem]">
            <ProjectCard project={project} index={i} total={projects.length} />
          </div>
        ))}
      </div>
    );
  }
  return <AnimatedStack projects={projects} />;
}

function AnimatedStack({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref, ["start start", "end end"]);
  const n = projects.length;

  return (
    <div ref={ref} className="relative" style={{ height: `calc(${(n - 1) * SLOT}svh + 100svh)` }}>
      {/* Âncoras do índice: cada uma aponta para o momento em que o projeto está inteiro na tela. */}
      {projects.map((project, i) => (
        <span
          key={project.slug}
          id={`projeto-${project.slug}`}
          aria-hidden="true"
          className="absolute left-0 h-px w-px"
          style={{ top: `calc(${i * SLOT}svh + var(--header-height))` }}
        />
      ))}

      <div className="sticky top-0 h-svh overflow-hidden">
        {projects.map((project, i) => (
          <StackCard key={project.slug} project={project} index={i} total={n} progress={progress} />
        ))}
      </div>
    </div>
  );
}

function StackCard({
  project,
  index,
  total,
  progress,
}: {
  project: Project;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const at = (v: number) => v * (total - 1);
  const entering = useTransform(progress, (v) => (index === 0 ? 1 : easeOut(segment(at(v), index - 1 + HOLD, index))));
  const covered = useTransform(progress, (v) => segment(at(v), index + HOLD, index + 1));

  const y = useTransform(entering, (t) => `${(1 - t) * 100}%`);
  const scale = useTransform(covered, (t) => lerp(1, 0.9, t));
  const shade = useTransform(covered, (t) => t * 0.7);
  const radius = useTransform([entering, covered], ([e, c]: number[]) => `${lerp(28, 16, e) + c * 12}px`);
  // Profundidade: o navegador chega de um pouco mais baixo, o celular de mais longe ainda.
  const stageY = useTransform(entering, (t) => `${(1 - t) * 18}%`);
  const frontY = useTransform(entering, (t) => `${(1 - t) * 45}%`);
  const contentOpacity = useTransform(progress, (v) => (index === 0 ? 1 : segment(at(v), index - 0.25, index)));
  const contentY = useTransform(contentOpacity, (t) => (1 - t) * 40);

  return (
    <m.article
      aria-labelledby={`projeto-${project.slug}-titulo`}
      style={{ y, scale, borderRadius: radius, zIndex: index }}
      className="absolute inset-2 origin-top overflow-hidden will-change-transform md:inset-3"
    >
      <ProjectCard
        project={project}
        index={index}
        total={total}
        stageY={stageY}
        frontY={frontY}
        contentStyle={{ opacity: contentOpacity, y: contentY }}
      />
      <m.div style={{ opacity: shade }} className="pointer-events-none absolute inset-0 bg-black" />
    </m.article>
  );
}

type MotionStyle = React.ComponentProps<typeof m.div>["style"];

function ProjectCard({
  project,
  index,
  total,
  stageY,
  frontY,
  contentStyle,
}: {
  project: Project;
  index: number;
  total: number;
  stageY?: MotionValue<string>;
  frontY?: MotionValue<string>;
  contentStyle?: MotionStyle;
}) {
  const light = project.theme.tone === "light";
  const accent = readableAccent(project.theme.accent, project.theme.bg);

  return (
    <div
      className={cn("absolute inset-0", light ? "text-white" : "text-ink")}
      style={{
        backgroundColor: project.theme.bg,
        backgroundImage: `radial-gradient(ellipse 70% 60% at 70% 45%, ${light ? "rgb(255 255 255 / 0.07)" : "rgb(255 255 255 / 0.55)"}, transparent 70%)`,
      }}
    >
      {/* Palco das telas */}
      <m.div
        style={stageY ? { y: stageY } : undefined}
        className="absolute inset-x-0 top-[calc(var(--header-height)+2.5rem)] h-[44%] lg:top-0 lg:bottom-0 lg:left-[36%] lg:h-auto"
      >
        <DeviceStage project={project} frontY={frontY} />
      </m.div>

      {/* Topo: selo e contador */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 pt-[calc(var(--header-height)+0.5rem)] md:p-10 md:pt-[calc(var(--header-height)+1rem)]">
        {project.sample ? (
          <span
            className={cn(
              "rounded-full px-3 py-1.5 font-mono text-[0.6875rem] tracking-wide",
              light ? "bg-white/10 text-white/80" : "bg-black/[0.06] text-black/60",
            )}
          >
            Projeto conceitual
          </span>
        ) : (
          <span />
        )}
        <span className={cn("font-mono text-xs tabular-nums", light ? "text-white/60" : "text-black/50")}>
          {pad(index + 1)} / {pad(total)}
        </span>
      </div>

      {/* Texto */}
      <m.div
        style={contentStyle}
        className="absolute inset-x-0 bottom-0 p-5 pb-8 md:p-10 md:pb-12 lg:top-0 lg:right-auto lg:flex lg:w-[36%] lg:flex-col lg:justify-end lg:pr-4"
      >
        <p className={cn("text-eyebrow", light ? "text-white/60" : "text-black/55")}>
          <span style={{ color: accent }}>{project.category}</span>
          {project.year && (
            <>
              <span className="mx-1.5 opacity-40">/</span>
              {project.year}
            </>
          )}
        </p>
        <h2
          id={`projeto-${project.slug}-titulo`}
          className="mt-4 text-[clamp(2.25rem,1rem+3.6vw,4.75rem)] leading-[0.98] font-semibold tracking-[-0.045em]"
        >
          {project.name}
        </h2>
        <p className={cn("mt-4 max-w-md text-base leading-relaxed md:text-lg", light ? "text-white/70" : "text-black/65")}>
          {project.summary}
        </p>
        <ul className={cn("mt-6 hidden space-y-2 border-t pt-5 sm:block", light ? "border-white/15" : "border-black/10")}>
          {project.highlights.map((item, i) => (
            <li key={i} className={cn("flex gap-3 text-[0.9375rem]", light ? "text-white/85" : "text-black/75")}>
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" style={{ color: accent }} strokeWidth={2.25} />
              {item}
            </li>
          ))}
        </ul>
        <ul className="mt-5 hidden flex-wrap gap-2 sm:flex">
          {project.services.map((service, i) => (
            <li
              key={i}
              className={cn("rounded-full border px-3 py-1 text-xs", light ? "border-white/20 text-white/70" : "border-black/15 text-black/60")}
            >
              {service}
            </li>
          ))}
        </ul>
        <Link
          href={`/projetos/${project.slug}`}
          className={cn(
            "group mt-7 inline-flex w-fit items-center gap-2 text-[0.9375rem] font-medium",
            light ? "text-white" : "text-ink",
          )}
        >
          <span className="link-underline">Ver projeto</span>
          <ArrowUpRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          <span className="sr-only">{project.name}</span>
        </Link>
      </m.div>
    </div>
  );
}

/** Composição das telas conforme o que o projeto tem: navegador, celulares ou ambos. */
function DeviceStage({ project, frontY }: { project: Project; frontY?: MotionValue<string> }) {
  const { desktop, phones } = project.screens;
  // Sem telas: a capa ocupa o palco como uma tela de computador.
  const main = desktop ?? (phones.length === 0 ? project.cover : null);
  const front = frontY ? { y: frontY } : undefined;

  if (main) {
    return (
      <div className="relative flex h-full items-center">
        <BrowserFrame
          screen={main}
          sizes="(min-width: 1024px) 64vw, 94vw"
          className="absolute left-1/2 w-[min(94%,calc(40svh*1.5))] -translate-x-1/2 lg:left-[4%] lg:w-[108%] lg:translate-x-0"
        />
        {phones[0] && (
          <m.div style={front} className="absolute bottom-[2%] left-[6%] w-[24%] lg:bottom-[12%] lg:left-[1%] lg:w-[17%]">
            <PhoneFrame screen={phones[0]} sizes="(min-width: 1024px) 14vw, 26vw" />
          </m.div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex h-full items-center justify-center gap-[5%]">
      {phones.map((screen, i) => (
        <m.div key={i} style={i === 1 ? front : undefined} className="aspect-[400/866] h-[94%] lg:h-[76%]">
          <div className={cn("h-full", i === 1 && "translate-y-[8%]")}>
            <PhoneFrame screen={screen} sizes="(min-width: 1024px) 20vw, 40vw" />
          </div>
        </m.div>
      ))}
    </div>
  );
}
