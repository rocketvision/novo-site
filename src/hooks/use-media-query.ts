"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Assina uma media query. No servidor retorna o valor de fallback. */
export function useMediaQuery(query: string, serverFallback = false) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}

/**
 * prefers-reduced-motion seguro para SSR: no servidor e na hidratação assume
 * movimento permitido, e atualiza logo em seguida sem erro de hidratação.
 */
export function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}
