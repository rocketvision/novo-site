"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Faixas dos eixos da Archivo variável usadas no efeito (peso e largura). */
const WGHT = { min: 180, max: 895 };
const WDTH = { min: 70, max: 125 };

/**
 * "Vamos?": o convite final, no modelo do da UKP Digital (parceira, com autorização). A palavra é
 * uma fonte variável que acompanha o mouse: da esquerda para a direita ela ganha peso, de baixo para
 * cima ganha largura, sempre com inércia. Em tela de toque, sem mouse, o mesmo movimento segue o
 * scroll. Com "reduzir movimento", fica parada no meio do caminho.
 */
export function LetsGo({ whatsapp, className }: { whatsapp?: string; className?: string }) {
  const title = useRef<HTMLHeadingElement>(null);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = title.current;
    const box = section.current;
    if (!el || !box) return;
    const apply = (wght: number, wdth: number) => {
      el.style.fontVariationSettings = `"wght" ${wght.toFixed(1)}, "wdth" ${wdth.toFixed(2)}`;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(540, 100);
      return;
    }

    // Alvo e valor atual em 0..1: x → peso, y → largura (topo largo, base estreita).
    const target = { x: 0, y: 1 };
    const current = { x: 0, y: 1 };
    let raf = 0;
    const step = () => {
      current.x += (target.x - current.x) * 0.1;
      current.y += (target.y - current.y) * 0.1;
      apply(WGHT.min + (WGHT.max - WGHT.min) * current.x, WDTH.max - (WDTH.max - WDTH.min) * current.y);
      raf = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.0005 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth;
      target.y = e.clientY / window.innerHeight;
      kick();
    };
    // Sem mouse: conforme a seção sobe na tela, a palavra engorda e alarga.
    const onScroll = () => {
      const r = box.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, 1 - r.top / window.innerHeight));
      target.x = k;
      target.y = 1 - k * 0.7;
      kick();
    };

    apply(WGHT.min, WDTH.min);
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    else {
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const talk = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Vim pelo site da Rocket Vision e quero conversar sobre o meu negócio.")}`
    : null;

  return (
    <section ref={section} aria-labelledby="vamos-titulo" className={cn("relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#09090b] px-[6%] py-28 text-center text-white", className)}>
      <div aria-hidden="true" className="pointer-events-none absolute top-[18%] left-1/2 h-[50svh] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(44_157_245/0.16),transparent)] blur-[80px]" />
      <h2
        id="vamos-titulo"
        ref={title}
        className="relative font-[family-name:var(--font-archivo)] text-[clamp(4.2rem,17vw,15rem)] leading-[0.82] tracking-[-0.05em] text-[#eef1f5]"
        style={{ fontVariationSettings: `"wght" ${WGHT.min}, "wdth" ${WDTH.min}` }}
      >
        Vamos?
      </h2>
      <p className="relative mt-8 max-w-[44ch] text-[1rem] leading-relaxed text-pretty text-white/65">
        Responda 7 perguntas rápidas e a gente lê o cenário do seu negócio. Leva 1 minuto, sem compromisso. A resposta chega em até 72 horas úteis.
      </p>
      <div className="relative mt-9 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          data-diagnostico
          className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#f6f7f9_0%,#d3d7de_55%,#b9bec7_100%)] px-6 text-[0.95rem] font-medium whitespace-nowrap text-[#0b0b0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.18),0_10px_30px_-12px_rgba(0,0,0,0.8)] transition-[transform,box-shadow] duration-300 ease-out select-none hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.18),0_14px_40px_-10px_rgb(44_157_245/0.55)]"
        >
          Quero vender mais
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
        {talk && (
          <a
            href={talk}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/[0.18] bg-white/[0.03] px-6 text-[0.95rem] font-medium whitespace-nowrap text-white/85 transition-[transform,border-color,background-color,color] duration-300 ease-out hover:border-white/40 hover:bg-white/[0.07] hover:text-white"
          >
            Chamar no WhatsApp
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5">
              <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.37l-.36-.22-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.46 0 .1 5.33.1 11.89c0 2.1.55 4.14 1.6 5.95L0 24l6.34-1.65a12.06 12.06 0 0 0 5.71 1.45h.01c6.58 0 11.95-5.33 11.95-11.89 0-3.18-1.24-6.16-3.5-8.41" />
            </svg>
          </a>
        )}
      </div>
    </section>
  );
}
