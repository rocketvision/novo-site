"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";

let instance: Lenis | null = null;

/**
 * Rola até uma posição com a mesma inércia da página.
 * Sem Lenis (movimento reduzido), cai no scroll nativo.
 */
export function scrollToY(top: number) {
  if (instance) instance.scrollTo(top, { duration: 1.2 });
  else window.scrollTo({ top, behavior: "smooth" });
}

/**
 * Scroll com inércia (Lenis), no ritmo das páginas da Apple, sincronizado com o ScrollTrigger:
 * o GSAP dá o compasso e o Lenis avisa o ScrollTrigger a cada quadro.
 * Com prefers-reduced-motion, o scroll nativo fica intacto.
 */
export function SmoothScroll() {
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const lenis = new Lenis({ lerp: 0.1, anchors: true });
    instance = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // O menu aberto trava o body: o Lenis para junto e volta quando o menu fecha.
    const observer = new MutationObserver(() => {
      if (document.body.style.overflow === "hidden") lenis.stop();
      else lenis.start();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    return () => {
      observer.disconnect();
      gsap.ticker.remove(tick);
      lenis.destroy();
      instance = null;
    };
  }, [reduceMotion]);

  return null;
}
