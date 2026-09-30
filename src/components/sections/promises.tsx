"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LettersStage, type LetterState, type StageState } from "@/components/three/letters-stage";
import { promises as copy } from "@/content/landing-scenes";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

const BLUE = "#2c9df5";

/** Posições das letras em cada momento (unidades da cena 3D; a altura de uma maiúscula é 1). */
const MONO: Record<"R" | "V", Partial<LetterState>> = {
  R: { x: -0.34, y: 0.02, s: 1.3, b: 1, o: 0 },
  V: { x: 0.36, y: -0.08, s: 1.3, b: 1, o: 0 },
};
const SPLIT: Record<"R" | "V", Partial<LetterState>> = {
  R: { x: -1.02, y: -0.12, s: 1, b: 0.8, o: 0 },
  V: { x: 0.98, y: 0.34, s: 1, b: 0.8, o: 0 },
};

/**
 * As duas letras da marca em 3D, como a vitrine de letras da UKP: o monograma RV em metal se abre,
 * as letras se afastam em volta de um círculo tracejado e cada uma acende com a sua órbita e a sua
 * promessa (Resultado, Visão), enquanto a outra escurece. No fim, se recolhem no centro e a logo da
 * Rocket se monta no lugar delas: juntas, viram a Rocket Vision. Presa ao scroll; o giro das letras e o ponto que corre na órbita seguem
 * vivos mesmo parado.
 */
export function Promises() {
  const ref = useRef<HTMLDivElement>(null);
  const stage = useRef<StageState>({
    letters: {
      R: { x: -0.34, y: 0.02, s: 1.3, b: 1, o: 0, r: -0.5 },
      V: { x: 0.36, y: -0.08, s: 1.3, b: 1, o: 0, r: 0.5 },
    },
    ring: 0,
    spin: 0,
    logo: { arcs: 0, rocket: 0 },
  });

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const { R, V } = stage.current.letters;
      const blocks = q("[data-block]");
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom bottom", scrub: 0.8 },
      });
      gsap.set(blocks.slice(1), { autoAlpha: 0, y: 24 });
      // Entra ainda com a cor da cena anterior e escurece.
      tl.fromTo(q("[data-veil]"), { opacity: 1 }, { opacity: 0, duration: 0.05, ease: "none" }, 0);

      // Giro lento de ponta a ponta: as letras mostram a espessura enquanto a página desce.
      tl.fromTo(R, { r: -0.5 }, { r: 0.9, duration: 1, ease: "none" }, 0)
        .fromTo(V, { r: 0.5 }, { r: -0.9, duration: 1, ease: "none" }, 0)
        .fromTo(stage.current, { spin: 0 }, { spin: 1, duration: 1, ease: "none" }, 0);

      const swap = (from: number, to: number, at: number) =>
        tl.to(blocks[from], { autoAlpha: 0, y: -24, duration: 0.05 }, at).to(blocks[to], { autoAlpha: 1, y: 0, duration: 0.07 }, at + 0.04);

      // O monograma se abre em volta do círculo.
      tl.to(R, { ...SPLIT.R, duration: 0.12 }, 0.1)
        .to(V, { ...SPLIT.V, duration: 0.12 }, 0.1)
        .fromTo(q("[data-rings]"), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.12 }, 0.1)
        .fromTo(stage.current, { ring: 0 }, { ring: 1, duration: 0.6, ease: "none" }, 0.1);
      // R acende: Resultado.
      swap(0, 1, 0.24);
      tl.to(R, { s: 1.2, b: 1, o: 1, duration: 0.08 }, 0.24).to(V, { s: 0.9, b: 0.12, duration: 0.08 }, 0.24);
      // V acende: Visão.
      swap(1, 2, 0.48);
      tl.to(R, { s: 0.9, b: 0.12, o: 0, duration: 0.08 }, 0.48).to(V, { s: 1.2, b: 1, o: 1, duration: 0.08 }, 0.48);
      // Juntas: as letras se recolhem no centro, girando, e a logo da Rocket se monta no lugar delas.
      swap(2, 3, 0.7);
      tl.to(R, { ...MONO.R, o: 0, duration: 0.08 }, 0.7)
        .to(V, { ...MONO.V, o: 0, duration: 0.08 }, 0.7)
        .to(R, { x: 0, y: 0, s: 0, r: "+=2.4", duration: 0.08, ease: "power3.in" }, 0.78)
        .to(V, { x: 0, y: 0, s: 0, r: "-=2.4", duration: 0.08, ease: "power3.in" }, 0.78)
        .to(stage.current.logo, { arcs: 1, duration: 0.1, ease: "power2.inOut" }, 0.82)
        .to(stage.current.logo, { rocket: 1, duration: 0.1, ease: "none" }, 0.86)
        .to(q("[data-rings]"), { opacity: 0.5, scale: 0.9, duration: 0.14 }, 0.72)
        .to({}, { duration: 0.12 });

      // Arco azul que corre pelo círculo conforme o scroll.
      const arc = q("[data-arc]")[0];
      tl.eventCallback("onUpdate", () => {
        if (arc) arc.style.transform = `rotate(${(stage.current.ring * 300 - 90).toFixed(1)}deg)`;
      });
    },
    { scope: ref },
  );

  return (
    <section id="rocket" aria-labelledby="rocket-titulo" data-header="dark" className="tone-dark relative bg-[#09090b] text-fg">
      <div ref={ref} className="relative h-[440svh]">
        <div className="sticky top-0 h-svh overflow-hidden">
          <div data-veil aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 bg-paper" />
          <div className="relative mx-auto grid h-full w-full max-w-[1320px] grid-rows-[46svh_1fr] px-[6%] pt-[var(--header-height)] lg:grid-cols-[1.05fr_1fr] lg:grid-rows-1 lg:items-center lg:px-12 lg:pt-0">
            <div className="relative h-full min-h-0 lg:h-[82svh]">
              {/* Círculos: o grande, quase apagado, o tracejado e o arco azul que corre com o scroll. */}
              <div data-rings aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center opacity-0">
                <svg viewBox="0 0 200 200" className="h-[min(100%,90vw)] max-h-full overflow-visible">
                  <circle cx="100" cy="100" r="98" fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth="0.35" />
                  <circle cx="100" cy="100" r="76" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="0.35" strokeDasharray="1 2.2" />
                  <g data-arc style={{ transformOrigin: "100px 100px" }}>
                    <circle cx="100" cy="100" r="62" fill="none" stroke={BLUE} strokeOpacity="0.55" strokeWidth="0.45" strokeDasharray="22 368" strokeLinecap="round" />
                    <circle cx="100" cy="100" r="62" fill="none" stroke={BLUE} strokeOpacity="0.3" strokeWidth="0.45" strokeDasharray="10 380" strokeDashoffset="-190" strokeLinecap="round" />
                  </g>
                </svg>
              </div>
              <LettersStage state={stage} labels={{ R: copy.letters[0].word.toLowerCase(), V: copy.letters[1].word.toLowerCase() }} className="absolute inset-0" />
            </div>

            <div className="relative min-h-[16rem] lg:min-h-[22rem]">
              <Block title={copy.intro.title} body={copy.intro.body} id="rocket-titulo" />
              {copy.letters.map((l) => (
                <Block key={l.letter} title={[l.word]} accent body={l.body} link={l.link} later />
              ))}
              <Block title={copy.outro.title} body={copy.outro.body} later />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Block({ title, body, accent, link, id, later }: { title: readonly string[]; body: string; accent?: boolean; link?: { label: string; href: string }; id?: string; later?: boolean }) {
  const Tag = id ? "h2" : "p";
  return (
    <div data-block className={cn("absolute inset-x-0 top-0 lg:top-1/2 lg:-translate-y-1/2", later && "invisible opacity-0")}>
      <Tag id={id} className="text-[clamp(2.2rem,4.8vw,4.4rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-balance">
        {title.map((line) => (
          <span key={line} className="block">
            {accent ? (
              <>
                <span style={{ color: BLUE }}>{line[0]}</span>
                {line.slice(1)}
              </>
            ) : (
              line
            )}
          </span>
        ))}
      </Tag>
      <p className="mt-6 max-w-[38ch] text-[1rem] leading-relaxed text-pretty text-fg/60">{body}</p>
      {link && (
        <Link href={link.href} className="group mt-6 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-fg">
          <span className="link-underline">{link.label}</span>
          <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
