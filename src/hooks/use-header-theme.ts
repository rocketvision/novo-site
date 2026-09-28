"use client";

import type { RefObject } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";

/**
 * Informa ao header se a cena está escura ou clara em cada momento do scroll.
 * O header lê o atributo data-header da seção sob ele.
 */
export function useHeaderTheme(
  ref: RefObject<HTMLElement | null>,
  progress: MotionValue<number>,
  isDark: (value: number) => boolean,
) {
  useMotionValueEvent(progress, "change", (value) => {
    ref.current?.setAttribute("data-header", isDark(value) ? "dark" : "light");
  });
}
