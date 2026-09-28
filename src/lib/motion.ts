/**
 * Linguagem de movimento da Rocket Vision.
 *
 * Todas as animações da página partem destes tokens. Os mesmos valores
 * existem em CSS (globals.css: --ease-out, --duration-*) para transições
 * que não precisam de JavaScript.
 */

export const ease = {
  /** Desaceleração longa. Padrão para entradas e reveals. */
  out: [0.22, 1, 0.36, 1],
  /** Simétrica. Para trocas de estado e crossfades. */
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const duration = {
  fast: 0.3,
  base: 0.7,
  slow: 1.1,
} as const;

export const stagger = 0.08;

/** Distância padrão de deslocamento vertical em reveals, em pixels. */
export const revealDistance = 24;

export const transition = {
  reveal: { duration: duration.base, ease: ease.out },
  slow: { duration: duration.slow, ease: ease.out },
  swap: { duration: duration.base, ease: ease.inOut },
} as const;
