"use client";

import type { RefObject } from "react";
import { useScroll } from "motion/react";

type Edge = "start" | "center" | "end";
export type ScrollEdge = `${Edge} ${Edge}`;

const edgeToNumber: Record<Edge, string> = { start: "0", center: "0.5", end: "1" };

/**
 * Progresso (0 a 1) de um elemento ao atravessar a viewport.
 * Ponto único de scroll-linked animation da página.
 *
 * Os offsets são convertidos para a forma numérica ("0 1") de propósito:
 * com os nomes ("start end") o Motion 13 usa ViewTimeline nativo, que ao sair
 * do intervalo devolve os elementos ao estado inicial em vez de manter o final.
 * O rastreamento em JS mantém o comportamento consistente em todos os navegadores.
 */
export function useScrollProgress(target: RefObject<HTMLElement | null>, offset: [ScrollEdge, ScrollEdge]) {
  const numeric = offset.map((pair) =>
    pair
      .split(" ")
      .map((edge) => edgeToNumber[edge as Edge])
      .join(" "),
  ) as [string, string];

  // O tipo de offset do Motion aceita a forma numérica em string.
  const { scrollYProgress } = useScroll({ target, offset: numeric as never });
  return scrollYProgress;
}
