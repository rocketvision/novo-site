"use client";

import { useEffect, type RefObject } from "react";
import { animate, useInView, useMotionValue } from "motion/react";
import { usePrefersReducedMotion } from "./use-media-query";

/**
 * Progresso (0 a 1) que corre uma vez quando o elemento entra na tela.
 * Para os visuais fora das cenas fixas (mobile), que não têm um scroll próprio para acompanhar.
 * Com prefers-reduced-motion, o visual já nasce no estado final.
 */
export function useRevealProgress(ref: RefObject<HTMLElement | null>, duration = 1.6) {
  const reduceMotion = usePrefersReducedMotion();
  const progress = useMotionValue(0);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });

  useEffect(() => {
    if (reduceMotion) {
      progress.set(1);
      return;
    }
    if (!inView) return;
    const controls = animate(progress, 1, { duration, ease: [0.65, 0, 0.35, 1], delay: 0.2 });
    return () => controls.stop();
  }, [inView, reduceMotion, progress, duration]);

  return progress;
}
