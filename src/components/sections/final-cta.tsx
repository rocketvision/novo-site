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
 * O vídeo surge como uma janela pequena com cantos arredondados e se abre até as bordas da tela
 * enquanto o título sobe linha a linha. O formulário vem logo abaixo, no mesmo escuro.
 */
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
              <LaunchpadVideo play={!reduceMotion} />
            </div>
            <div data-shade className="absolute inset-0 bg-[linear-gradient(0deg,var(--color-ink)_0%,rgb(10_10_11/0.55)_45%,rgb(10_10_11/0.15)_100%)]" />
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
