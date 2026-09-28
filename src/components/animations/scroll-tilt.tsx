"use client";

/**
 * Adaptado de "Container Scroll Animation" (Aceternity UI, publicado no 21st.dev).
 * Mudanças: sem título acoplado, curvas mais sutis, offset calculado a partir da
 * posição real do elemento, sem listener de resize (usa media query) e versão
 * estática para prefers-reduced-motion.
 */

import { useRef } from "react";
import { m, useTransform } from "motion/react";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { useMediaQuery, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export function ScrollTilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)", true);
  const scrollYProgress = useScrollProgress(ref, ["start end", "center center"]);

  const rotateX = useTransform(scrollYProgress, [0, 1], [isDesktop ? 22 : 12, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], isDesktop ? [1.04, 1] : [0.94, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [isDesktop ? 40 : 16, 0]);

  return (
    <div ref={ref} className={cn("[perspective:1400px]", className)}>
      <m.div
        style={reduceMotion ? undefined : { rotateX, scale, y, transformOrigin: "50% 0%" }}
        className="will-change-transform"
      >
        {children}
      </m.div>
    </div>
  );
}
