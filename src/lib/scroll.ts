/** Utilitários puros para mapear o progresso do scroll em estados de animação. */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Progresso local (0 a 1) de v dentro do intervalo [start, end]. */
export const segment = (v: number, start: number, end: number) => clamp01((v - start) / (end - start));

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** clip-path inset com cantos arredondados, em porcentagem da caixa. */
export const insetClip = (top: number, right: number, bottom: number, left: number, radius = 0) =>
  `inset(${top}% ${right}% ${bottom}% ${left}% round ${radius}px)`;
