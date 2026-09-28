"use client";

import Image from "next/image";
import { useRef } from "react";
import { m, useTransform, type MotionValue } from "motion/react";
import { Check } from "lucide-react";
import type { Project } from "@/content/projects";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { lerp, segment } from "@/lib/scroll";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
/** Quanto do trecho de cada projeto ele fica parado antes do próximo começar a subir. */
const HOLD = 0.3;
/** Altura de scroll dedicada a cada projeto, em svh. */
const SLOT = 110;

/**
 * Pilha de projetos em tela cheia.
 * Cada projeto sobe por cima do anterior como um cartão; o de baixo recua,
 * escurece e ganha cantos, criando profundidade. A foto se aproxima enquanto entra.
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
  const slots = total - 1;
  // Posição contínua na pilha: 0 = primeiro projeto inteiro, 1 = segundo, e assim por diante.
  const at = (v: number) => v * slots;

  const y = useTransform(progress, (v) => {
    if (index === 0) return "0%";
    const t = segment(at(v), index - 1 + HOLD, index);
    return `${(1 - easeOut(t)) * 100}%`;
  });
  // Quando o próximo sobe, este recua e escurece.
  const covered = useTransform(progress, (v) => segment(at(v), index + HOLD, index + 1));
  const scale = useTransform(covered, (t) => lerp(1, 0.9, t));
  const shade = useTransform(covered, (t) => t * 0.7);
  const radius = useTransform(progress, (v) => {
    const entering = index === 0 ? 1 : segment(at(v), index - 1 + HOLD, index);
    const c = segment(at(v), index + HOLD, index + 1);
    return `${lerp(28, 16, entering) + c * 12}px`;
  });
  const photoScale = useTransform(progress, (v) => lerp(1.25, 1, segment(at(v), index - 1 + HOLD, index + 0.6)));
  const contentOpacity = useTransform(progress, (v) => (index === 0 ? 1 : segment(at(v), index - 0.25, index)));
  const contentY = useTransform(contentOpacity, (t) => (1 - t) * 40);

  return (
    <m.article
      aria-labelledby={`projeto-${project.slug}-titulo`}
      style={{ y, scale, borderRadius: radius, zIndex: index }}
      className="absolute inset-2 origin-top overflow-hidden bg-ink will-change-transform md:inset-3"
    >
      <ProjectCard project={project} index={index} total={total} photoScale={photoScale} contentStyle={{ opacity: contentOpacity, y: contentY }} />
      <m.div style={{ opacity: shade }} className="pointer-events-none absolute inset-0 bg-black" />
    </m.article>
  );
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

type MotionStyle = React.ComponentProps<typeof m.div>["style"];

function ProjectCard({
  project,
  index,
  total,
  photoScale,
  contentStyle,
}: {
  project: Project;
  index: number;
  total: number;
  photoScale?: MotionValue<number>;
  contentStyle?: MotionStyle;
}) {
  return (
    <>
      <m.div style={photoScale ? { scale: photoScale } : undefined} className="absolute inset-0">
        <Image
          src={project.image.src}
          alt={project.image.alt}
          fill
          sizes="100vw"
          placeholder="blur"
          quality={80}
          className="object-cover"
          style={{ objectPosition: project.image.position }}
        />
      </m.div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 pt-[calc(var(--header-height)+0.5rem)] md:p-10 md:pt-[calc(var(--header-height)+1rem)]">
        {project.sample ? (
          <span className="rounded-full bg-white/15 px-3 py-1.5 font-mono text-[0.6875rem] tracking-wide text-white/85 backdrop-blur-md">
            Projeto de exemplo
          </span>
        ) : (
          <span />
        )}
        <span className="font-mono text-xs text-white/70 tabular-nums">
          {pad(index + 1)} / {pad(total)}
        </span>
      </div>

      <m.div
        style={contentStyle}
        className="absolute inset-x-0 bottom-0 grid gap-6 p-5 pb-8 text-white md:p-10 md:pb-12 lg:grid-cols-12 lg:items-end lg:gap-10"
      >
        <div className="lg:col-span-7">
          <p className="text-eyebrow text-white/65">
            {project.category} <span className="mx-1.5 text-white/30">/</span> {project.year}
          </p>
          <h2
            id={`projeto-${project.slug}-titulo`}
            className="mt-4 text-[clamp(2.5rem,1rem+5.6vw,6.5rem)] leading-[0.95] font-semibold tracking-[-0.05em]"
          >
            {project.name}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">{project.summary}</p>
        </div>

        <div className="hidden sm:block lg:col-span-4 lg:col-start-9">
          <p className="text-sm text-white/55">{project.client}</p>
          <ul className="mt-4 space-y-2.5 border-t border-white/15 pt-4">
            {project.highlights.map((item) => (
              <li key={item} className="flex gap-3 text-[0.9375rem] text-white/90">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2.25} />
                {item}
              </li>
            ))}
          </ul>
          <ul className="mt-5 flex flex-wrap gap-2">
            {project.services.map((service) => (
              <li key={service} className={cn("rounded-full border border-white/20 px-3 py-1 text-xs text-white/75")}>
                {service}
              </li>
            ))}
          </ul>
        </div>
      </m.div>
    </>
  );
}
