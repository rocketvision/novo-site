"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { transition } from "@/lib/motion";

/**
 * Carrega apenas o conjunto de recursos de animação usado na página (domAnimation)
 * e respeita prefers-reduced-motion em todas as animações de transform.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={transition.reveal}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
