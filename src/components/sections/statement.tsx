"use client";

import { useRef } from "react";
import type { Resolved } from "@/lib/content/resolved";
import { LogoMark } from "@/components/ui/logo";
import { OrderedStack } from "@/components/visuals/ordered-stack";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

/**
 * Virada da narrativa: o escuro do problema dá lugar à luz da solução.
 * O fundo clareia, a proposta acende letra por letra e, ao lado, os improvisos do começo
 * voam de todos os lados até se encaixarem em coluna, ligados à Rocket, cada um com o seu check.
 */
type Content = Resolved<"statement">;
type Problem = Resolved<"problem">;

export function Statement({ statement, problem }: { statement: Content; problem: Problem }) {
  const reduceMotion = usePrefersReducedMotion();
  return reduceMotion ? <StaticStatement statement={statement} problem={problem} /> : <AnimatedStatement statement={statement} problem={problem} />;
}

function AnimatedStatement({ statement, problem }: { statement: Content; problem: Problem }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = ref.current;
      if (!section) return;
      const q = gsap.utils.selector(section);
      const split = SplitText.create(q("[data-statement-title]"), { type: "chars,words" });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          // O header acompanha a virada do escuro para o claro.
          onUpdate: (self) => section.setAttribute("data-header", self.progress < 0.16 ? "dark" : "light"),
        },
      });

      // A virada: o escuro do problema dá lugar à luz da solução.
      tl.fromTo(section, { backgroundColor: "#0a0a0b" }, { backgroundColor: "#fbfbfd", duration: 0.28 }, 0)
        .fromTo(q("[data-copy]"), { color: "#ffffff" }, { color: "#0a0a0b", duration: 0.26 }, 0.02)
        .fromTo(q("[data-mark]"), { rotation: -90, scale: 0.4, opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, duration: 0.2, ease: "back.out(2)" }, 0.04)
        // A promessa acende letra por letra.
        .fromTo(split.chars, { opacity: 0.12 }, { opacity: 1, stagger: 0.45 / split.chars.length, duration: 0.05 }, 0.08)
        .fromTo(q("[data-body]"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.12, ease: "power2.out" }, 0.55)
        // O palco sobe e os improvisos voam de todos os lados até se encaixarem em coluna.
        .fromTo(q("[data-stack]"), { clipPath: "inset(40% 10% 10% 10% round 28px)", y: 80 }, { clipPath: "inset(0% 0% 0% 0% round 28px)", y: 0, duration: 0.3, ease: "power2.out" }, 0.1)
        .from(
          q("[data-stack-item]"),
          {
            x: (i: number) => (i % 2 === 0 ? -1 : 1) * (220 + i * 40),
            y: (i: number) => 260 + i * 60,
            rotation: (i: number) => (i % 2 === 0 ? -1 : 1) * (14 + i * 6),
            opacity: 0,
            stagger: 0.07,
            duration: 0.25,
            ease: "power3.out",
          },
          0.22,
        )
        .from(q("[data-stack-line]"), { scaleY: 0, transformOrigin: "top", duration: 0.2 }, 0.5)
        .from(q("[data-stack-check]"), { scale: 0, stagger: 0.04, duration: 0.08, ease: "back.out(3)" }, 0.58)
        .from(q("[data-stack-logo]"), { scale: 0, rotation: -120, duration: 0.12, ease: "back.out(2)" }, 0.48);

      return () => split.revert();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} aria-labelledby="statement-titulo" data-header="dark" className="relative h-[260vh] bg-ink">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="container-page relative grid h-full grid-rows-[auto_1fr] gap-8 pt-[calc(var(--header-height)+3rem)] pb-8 lg:grid-cols-12 lg:grid-rows-1 lg:items-center lg:gap-10 lg:py-0">
          <div data-copy className="relative z-10 text-white lg:col-span-7">
            <span data-mark className="inline-block">
              <LogoMark className="size-9 text-accent" />
            </span>
            <h2 id="statement-titulo" data-statement-title className="mt-6 text-[clamp(2.125rem,1rem+3vw,4.25rem)] leading-[1.04] font-semibold tracking-[-0.04em] lg:mt-8">
              <StatementTitle title={statement.title} />
            </h2>
            <p data-body className="text-lead mt-6 max-w-xl text-muted lg:mt-8">
              {statement.body}
            </p>
          </div>

          <div className="relative min-h-0 lg:col-span-5 lg:h-[72svh]">
            <div data-stack className="absolute inset-0 overflow-hidden rounded-[1.75rem]">
              <OrderedStack problem={problem} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StaticStatement({ statement, problem }: { statement: Content; problem: Problem }) {
  return (
    <section aria-labelledby="statement-titulo" className="bg-paper py-28">
      <div className="container-page grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <LogoMark className="size-9 text-accent" />
          <h2 id="statement-titulo" className="text-headline mt-8 text-ink">
            <StatementTitle title={statement.title} />
          </h2>
          <p className="text-lead mt-8 max-w-xl text-muted">{statement.body}</p>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] lg:col-span-5">
          <OrderedStack problem={problem} />
        </div>
      </div>
    </section>
  );
}

/** A promessa em destaque; o complemento em tom mais baixo, na mesma linha de leitura. */
function StatementTitle({ title }: { title: string }) {
  const [first, ...rest] = title.split(". ");
  if (rest.length === 0) return <>{title}</>;
  return (
    <>
      {`${first}. `}
      <span className="opacity-40">{rest.join(". ")}</span>
    </>
  );
}
