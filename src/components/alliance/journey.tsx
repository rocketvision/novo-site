"use client";

import { useRef } from "react";
import { JOURNEY } from "@/lib/alliance/constants";
import { gsap, useGSAP } from "@/lib/gsap";

const BLUE = "#2c9df5";

const DETAILS: Record<(typeof JOURNEY)[number]["key"], string> = {
  apply: "Você conta sobre a empresa, a modalidade desejada e o seu interesse na parceria.",
  review: "A equipe da Rocket Vision analisa o perfil e o alinhamento com o programa.",
  onboarding: "Termo de parceria, orientações e o acesso ao Alliance Hub.",
  grow: "Indicações, oportunidades e projetos conjuntos, acompanhados pelo portal.",
  rewards: "Comissões transparentes, resultados medidos e evolução de nível.",
};

/**
 * A jornada em cinco etapas. Com o scroll, a linha azul acende da primeira à última e cada etapa
 * ganha o seu ponto. Em "reduzir movimento", a linha já aparece inteira.
 */
export function Journey() {
  const ref = useRef<HTMLOListElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(ref);
        const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: "top 75%", end: "bottom 55%", scrub: 0.6 } });
        tl.fromTo(q("[data-line]"), { scaleX: 0, scaleY: 0 }, { scaleX: 1, scaleY: 1, ease: "none", duration: 1 }, 0);
        q("[data-step]").forEach((el, i) => {
          tl.fromTo(el, { opacity: 0.35 }, { opacity: 1, duration: 0.2 }, i * 0.2);
          tl.fromTo(el.querySelector("[data-dot]"), { scale: 0.4, backgroundColor: "rgb(255 255 255 / 0.2)" }, { scale: 1, backgroundColor: BLUE, duration: 0.2 }, i * 0.2);
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <ol ref={ref} className="relative mt-16 grid gap-10 md:mt-24 md:grid-cols-5 md:gap-6">
      {/* Trilho: horizontal no desktop, vertical no celular. */}
      <span aria-hidden="true" className="absolute top-2 bottom-2 left-[5px] w-px bg-white/10 md:top-[5px] md:right-0 md:bottom-auto md:left-0 md:h-px md:w-full" />
      <span data-line aria-hidden="true" className="absolute top-2 bottom-2 left-[5px] w-px origin-top md:top-[5px] md:right-0 md:bottom-auto md:left-0 md:h-px md:w-full md:origin-left" style={{ background: `linear-gradient(180deg, ${BLUE}, rgb(44 157 245 / 0.4))` }} />
      {JOURNEY.map((step, i) => (
        <li key={step.key} data-step className="relative pl-9 md:pt-12 md:pl-0">
          <span data-dot aria-hidden="true" className="absolute top-1 left-0 size-[11px] rounded-full ring-4 ring-[#050507] md:top-0" style={{ background: BLUE }} />
          <p className="font-mono text-[0.7rem] text-white/35">0{i + 1}</p>
          <h3 className="mt-3 text-[1.35rem] leading-tight font-semibold tracking-[-0.03em]">{step.name}</h3>
          <p className="mt-1 text-[0.8125rem] font-medium" style={{ color: BLUE }}>
            {step.label}
          </p>
          <p className="mt-3 max-w-[18rem] text-[0.875rem] leading-relaxed text-white/55">{DETAILS[step.key]}</p>
        </li>
      ))}
    </ol>
  );
}
