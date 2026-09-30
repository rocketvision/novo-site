"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { promises as copy } from "@/content/landing-scenes";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

const BLUE = "#2c9df5";

/**
 * As duas letras da marca, R e V, em metal, cada uma com a sua órbita. Preso ao scroll: primeiro as
 * duas, depois cada uma acende com a sua promessa (Resultado, Visão) e, no fim, elas se encaixam
 * num monograma: juntas, viram a Rocket Vision.
 */
export function Promises() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const [r, v] = q("[data-glyph]");
      const blocks = q("[data-block]");
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      gsap.set(blocks.slice(1), { autoAlpha: 0, y: 30 });
      // Entra ainda escura, com a cor da cena anterior, e clareia.
      tl.fromTo(q("[data-veil]"), { opacity: 1 }, { opacity: 0, duration: 0.06, ease: "none" }, 0);

      // Giro contínuo e lento: as letras mostram a espessura enquanto a página desce.
      tl.fromTo(r, { rotateY: -32, rotateX: 8 }, { rotateY: 28, rotateX: -6, duration: 1, ease: "none" }, 0)
        .fromTo(v, { rotateY: 30, rotateX: -8 }, { rotateY: -24, rotateX: 6, duration: 1, ease: "none" }, 0)
        .fromTo(q("[data-letters]"), { scale: 0.86, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.12 }, 0);

      const swap = (from: number, to: number, at: number) =>
        tl.to(blocks[from], { autoAlpha: 0, y: -30, duration: 0.06 }, at).to(blocks[to], { autoAlpha: 1, y: 0, duration: 0.08 }, at + 0.05);

      // R acende.
      swap(0, 1, 0.2);
      tl.to(r, { scale: 1.18, duration: 0.1 }, 0.2).to(v, { opacity: 0.25, scale: 0.9, duration: 0.1 }, 0.2).to(q("[data-orbit='r']"), { opacity: 1, duration: 0.08 }, 0.22);
      // V acende.
      swap(1, 2, 0.45);
      tl.to(r, { scale: 0.9, opacity: 0.25, duration: 0.1 }, 0.45)
        .to(v, { scale: 1.18, opacity: 1, duration: 0.1 }, 0.45)
        .to(q("[data-orbit='r']"), { opacity: 0.25, duration: 0.08 }, 0.45)
        .to(q("[data-orbit='v']"), { opacity: 1, duration: 0.08 }, 0.47);
      // Juntas: as duas se encaixam num monograma.
      swap(2, 3, 0.7);
      tl.to(r, { scale: 1, opacity: 1, xPercent: 26, duration: 0.14 }, 0.7)
        .to(v, { scale: 1, opacity: 1, xPercent: -26, yPercent: 8, duration: 0.14 }, 0.7)
        .to(q("[data-orbit]"), { opacity: 0, duration: 0.08 }, 0.7)
        .fromTo(q("[data-ring]"), { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.14 }, 0.76)
        .to({}, { duration: 0.1 });
    },
    { scope: ref },
  );

  return (
    <section id="rocket" aria-labelledby="rocket-titulo" className="tone-light relative bg-tone text-fg">
      <div ref={ref} className="relative h-[420svh]">
        <div className="sticky top-0 h-svh overflow-hidden">
          <div data-veil aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 bg-ink" />
          <div className="container-page grid h-full content-center gap-6 pt-[var(--header-height)] lg:grid-cols-12 lg:items-center">
            <div className="relative grid place-items-center lg:col-span-6 [perspective:1400px]" aria-hidden="true">
              <div data-ring className="absolute size-[min(34rem,78vw)] rounded-full border border-fg/10 opacity-0 max-lg:size-[min(22rem,70vw)]">
                <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full" style={{ background: BLUE, boxShadow: `0 0 18px ${BLUE}` }} />
              </div>
              <div data-letters className="flex items-center gap-[4vw]">
                <Glyph letter="R" orbit="r" label={copy.letters[0].word} />
                <Glyph letter="V" orbit="v" label={copy.letters[1].word} />
              </div>
            </div>

            <div className="relative min-h-[16rem] lg:col-span-5 lg:col-start-8">
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

function Glyph({ letter, orbit, label }: { letter: string; orbit: "r" | "v"; label: string }) {
  const size = "text-[clamp(8rem,20vw,19rem)]";
  // Metal escuro sobre o claro. Espessura: uma cópia empilhada atrás, deslocada pixel a pixel.
  const depth = Array.from({ length: 14 }, (_, i) => `${(i + 1) * 0.6}px ${(i + 1) * 0.6}px 0 hsl(215 6% ${74 - i * 2}%)`).join(",");
  return (
    <div data-glyph className="relative [transform-style:preserve-3d]">
      <svg data-orbit={orbit} viewBox="0 0 200 120" className="absolute top-1/2 left-1/2 w-[150%] -translate-x-1/2 -translate-y-1/2 opacity-40" fill="none">
        <ellipse cx="100" cy="60" rx="96" ry="34" stroke="rgb(10 10 11 / 0.2)" strokeWidth="0.6" transform="rotate(-14 100 60)" />
        <circle cx="12" cy="76" r="2.2" fill={BLUE} />
      </svg>
      <span data-orbit={orbit} className="absolute -right-[18%] top-[18%] font-mono text-[0.625rem] tracking-[0.14em] whitespace-nowrap text-fg/45 uppercase opacity-40 max-sm:hidden">
        — {label}
      </span>
      <span className={cn("relative block leading-[0.8] font-black tracking-[-0.04em]", size)}>
        <span className="absolute inset-0 text-[#9ba1a9]" style={{ textShadow: depth }}>
          {letter}
        </span>
        <span className="relative bg-[linear-gradient(172deg,#6b727c_0%,#1c1f24_30%,#8f97a1_48%,#202328_66%,#5e656f_84%,#2a2d33_100%)] bg-clip-text text-transparent">{letter}</span>
      </span>
    </div>
  );
}

function Block({ title, body, accent, link, id, later }: { title: readonly string[]; body: string; accent?: boolean; link?: { label: string; href: string }; id?: string; later?: boolean }) {
  const Tag = id ? "h2" : "p";
  return (
    <div data-block className={cn("absolute inset-x-0 top-1/2 -translate-y-1/2", later && "invisible opacity-0")}>
      <Tag id={id} className="text-[clamp(2.25rem,1.3rem+3vw,4rem)] leading-[1] font-semibold tracking-[-0.045em]">
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
      <p className="mt-5 max-w-[26rem] text-[0.9375rem] leading-relaxed text-fg/55">{body}</p>
      {link && (
        <Link href={link.href} className="group mt-6 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-fg">
          <span className="link-underline">{link.label}</span>
          <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
