"use client";

/**
 * GSAP da landing: um único ponto de registro dos plugins.
 *
 * - ScrollTrigger: coreografias presas ao scroll (scrub), inclusive dentro de trilhos horizontais.
 * - SplitText: títulos que acendem ou sobem palavra por palavra.
 * - DrawSVGPlugin e MotionPathPlugin: o traço do caminho e o foguete que o percorre.
 *
 * Todos os plugins fazem parte do pacote gratuito do GSAP desde a versão 3.13.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin, useGSAP);
}

export { gsap, ScrollTrigger, SplitText, MotionPathPlugin, useGSAP };
