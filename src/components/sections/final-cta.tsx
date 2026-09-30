"use client";

import { useRef } from "react";
import { Reveal } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LaunchpadVideo } from "@/components/ui/launchpad-video";
import type { Resolved } from "@/lib/content/resolved";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { ContactForm } from "./contact-form";

/**
 * Convite final: o foguete na plataforma, motores acesos, pronto para decolar. A abertura mostra
 * a decolagem; aqui é a contagem regressiva do próximo lançamento, o projeto de quem está lendo.
 * O vídeo surge como uma janela pequena com cantos arredondados e se abre até as bordas da tela.
 * Enquanto isso, um contador desce de T−10 a T−00 com o scroll (quem rola faz a contagem); no zero,
 * "Ignição", e o título sobe linha a linha. O formulário vem logo abaixo, no mesmo escuro.
 */

/** Momentos da contagem no progresso da cena (0 a 1): termina logo antes do título subir. */
const COUNT = { from: 10, start: 0.04, end: 0.46 };

const tMinus = (n: number) => `T\u2212${String(n).padStart(2, "0")}`;
export function FinalCta({ cta, contact }: { cta: Resolved<"cta">; contact: Resolved<"site">["contact"] }) {
  const bandRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduceMotion) return;
      const q = gsap.utils.selector(bandRef);
      const split = SplitText.create(q("[data-cta-title] > span"), { type: "words", mask: "words" });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: bandRef.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      // Contagem regressiva: atualiza o texto direto no DOM (sem re-render a cada quadro).
      const digits = q("[data-count-digits]")[0] as HTMLElement;
      const label = q("[data-count-label]")[0] as HTMLElement;
      const bar = q("[data-count-bar]")[0] as HTMLElement;
      let shown = -1;
      tl.eventCallback("onUpdate", () => {
        const k = gsap.utils.clamp(0, 1, (tl.progress() - COUNT.start) / (COUNT.end - COUNT.start));
        const n = Math.ceil(COUNT.from * (1 - k));
        bar.style.transform = `scaleX(${k})`;
        if (n === shown) return;
        const ignition = n === 0;
        digits.textContent = tMinus(n);
        label.textContent = ignition ? "Ignição" : "Contagem regressiva";
        label.dataset.ignition = ignition ? "true" : "false";
        // Cada número entra de cima, como num painel de lançamento.
        if (shown !== -1) gsap.fromTo(digits, { yPercent: -35, opacity: 0.25 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: "power3.out", overwrite: true });
        shown = n;
      });

      tl.fromTo(q("[data-window]"), { clipPath: "inset(22% 18% 22% 18% round 40px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 0.6, ease: "power2.inOut" }, 0)
        .fromTo(q("[data-video]"), { scale: 1.35 }, { scale: 1, duration: 1 }, 0)
        .fromTo(q("[data-shade]"), { opacity: 0.2 }, { opacity: 1, duration: 0.5 }, 0.3)
        .fromTo(q("[data-eyebrow]"), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.15 }, 0.45)
        .fromTo(split.words, { yPercent: 110 }, { yPercent: 0, stagger: 0.03, duration: 0.25, ease: "power3.out" }, 0.5);
      return () => split.revert();
    },
    { scope: bandRef, dependencies: [reduceMotion] },
  );

  return (
    <section id="contato" aria-labelledby="contato-titulo" className="relative bg-ink text-white" data-header="dark">
      <div ref={bandRef} className={reduceMotion ? "relative" : "relative h-[220vh]"}>
        <div className="sticky top-0 h-svh overflow-hidden">
          <div data-window className="absolute inset-0 overflow-hidden">
            <div data-video className="absolute inset-0">
              {/* Toca mesmo com "reduzir movimento" (escolha da Rocket); a coreografia de scroll fica desligada. */}
              <LaunchpadVideo />
            </div>
            <div data-shade className="absolute inset-0 bg-[linear-gradient(0deg,var(--color-ink)_0%,rgb(10_10_11/0.55)_45%,rgb(10_10_11/0.15)_100%)]" />
          </div>

          {/* Contagem regressiva do próximo lançamento. Decorativa: o conteúdo da seção é o título. */}
          <div aria-hidden="true" className="container-page pointer-events-none absolute inset-x-0 top-[calc(var(--header-height)+1.5rem)] flex justify-end md:top-[calc(var(--header-height)+2.5rem)]">
            <div className="w-[min(15rem,42vw)] text-right">
              <p data-count-label data-ignition={reduceMotion ? "true" : "false"} className="text-eyebrow text-white/55 transition-colors duration-500 data-[ignition=true]:text-accent">
                {reduceMotion ? "Ignição" : "Contagem regressiva"}
              </p>
              <p data-count-digits className="mt-3 font-mono text-[clamp(2.25rem,5vw,4.25rem)] leading-none font-medium tracking-[-0.04em] text-white/90 tabular-nums">
                {tMinus(reduceMotion ? 0 : COUNT.from)}
              </p>
              <div className="mt-4 h-px overflow-hidden bg-white/15">
                <div data-count-bar className="h-full origin-left bg-white/70" style={{ transform: `scaleX(${reduceMotion ? 1 : 0})` }} />
              </div>
            </div>
          </div>

          <div className="container-page relative flex h-full flex-col justify-end pb-16 md:pb-24">
            <div data-eyebrow>
              <Eyebrow className="text-white/70">{cta.eyebrow}</Eyebrow>
            </div>
            <h2 id="contato-titulo" data-cta-title className="text-display mt-6 max-w-5xl">
              {cta.titleLines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h2>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-14 pt-10 pb-28 md:pb-36 lg:grid-cols-12 lg:gap-12">
        <Reveal as="p" className="text-lead text-white/65 lg:col-span-4">
          {cta.lead}
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7 lg:col-start-6">
          <ContactForm cta={cta} contact={contact} />
        </Reveal>
      </div>
    </section>
  );
}
