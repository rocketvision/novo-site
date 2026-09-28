"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, m, useMotionValue, useSpring } from "motion/react";
import { ArrowDownRight } from "lucide-react";
import type { PublicProject as Project } from "@/lib/projects/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Índice tipográfico dos projetos.
 * Em telas com mouse, a fotografia do projeto em foco acompanha o cursor com inércia.
 * Clicar leva ao projeto na pilha logo abaixo.
 */
export function ProjectIndex({ projects }: { projects: Project[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)", false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 26, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 220, damping: 26, mass: 0.6 });

  return (
    <div
      className="relative"
      onPointerMove={(event) => {
        x.set(event.clientX);
        y.set(event.clientY);
      }}
      onPointerLeave={() => setHovered(null)}
    >
      <ol className="border-t border-white/10">
        {projects.map((project, i) => (
          <li key={project.slug} className="border-b border-white/10">
            <a
              href={`#projeto-${project.slug}`}
              onPointerEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              className={cn(
                "group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-6 transition-opacity duration-500 md:grid-cols-[3.5rem_1fr_12rem_5rem_2rem] md:py-8",
                hovered !== null && hovered !== i && "md:opacity-35",
              )}
            >
              <span className="font-mono text-xs text-white/40 tabular-nums">{pad(i + 1)}</span>
              <span className="text-[clamp(1.625rem,1rem+2.6vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-white transition-transform duration-500 ease-out md:group-hover:translate-x-3">
                {project.name}
              </span>
              <span className="hidden text-sm text-white/55 md:block">{project.category}</span>
              <span className="hidden font-mono text-xs text-white/40 tabular-nums md:block">{project.year}</span>
              <ArrowDownRight
                aria-hidden="true"
                className="size-5 text-white/40 transition-all duration-500 group-hover:text-accent md:group-hover:translate-x-0.5 md:group-hover:translate-y-0.5"
              />
            </a>
          </li>
        ))}
      </ol>

      {canHover && (
        <m.div
          aria-hidden="true"
          style={{ x: springX, y: springY }}
          className="pointer-events-none fixed top-0 left-0 z-30"
        >
          <AnimatePresence>
            {hovered !== null && (
              <m.div
                key="preview"
                initial={{ opacity: 0, scale: 0.8, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative -mt-[7.5rem] ml-10 h-[15rem] w-[22rem] overflow-hidden rounded-2xl shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)] ring-1 ring-white/10"
              >
                {projects.map((project, i) => {
                  const screen = project.screens.desktop ?? project.cover ?? project.screens.phones[0];
                  if (!screen) return null;
                  return (
                    <m.div
                      key={project.slug}
                      initial={false}
                      animate={{ opacity: hovered === i ? 1 : 0, scale: hovered === i ? 1 : 1.08 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: project.theme.bg }}
                    >
                      {screen !== project.screens.phones[0] ? (
                        <Image src={screen.src} alt="" fill sizes="352px" className="object-cover object-top" />
                      ) : (
                        <div className="relative h-[88%] aspect-[390/844] overflow-hidden rounded-xl">
                          <Image src={screen.src} alt="" fill sizes="120px" className="object-cover" />
                        </div>
                      )}
                    </m.div>
                  );
                })}
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      )}
    </div>
  );
}
