"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { plans as copy } from "@/content/landing-scenes";
import { gsap, useGSAP } from "@/lib/gsap";

const BLUE = "#2c9df5";

/**
 * Planos: três rotas em degraus. Com o scroll, as colunas sobem uma a uma, como uma escada, e a
 * linha azul no topo de cada uma se desenha, ligando uma à outra.
 */
export function Plans() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const tl = gsap.timeline({ scrollTrigger: { trigger: q("[data-plans]")[0], start: "top 85%", end: "bottom 60%", scrub: 0.6 } });
      tl.fromTo(q("[data-plan]"), { opacity: 0, y: 80 }, { opacity: 1, y: 0, stagger: 0.25, duration: 0.6, ease: "power3.out" })
        .fromTo(q("[data-line]"), { scaleX: 0 }, { scaleX: 1, stagger: 0.25, duration: 0.5, ease: "none" }, 0.2);
      gsap.fromTo(q("[data-letter]"), { yPercent: 12 }, { yPercent: -12, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true } });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="planos" aria-labelledby="planos-titulo" data-header="dark" className="relative overflow-hidden bg-ink text-white">
      <span data-letter aria-hidden="true" className="pointer-events-none absolute -top-[4vw] right-[3vw] text-[min(60vw,48rem)] leading-none font-bold tracking-[-0.06em] text-white/[0.025] select-none">
        P
      </span>
      <div className="container-page relative py-28 md:py-36">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-eyebrow text-white/45">{copy.label}</p>
            <h2 id="planos-titulo" className="mt-6 text-[clamp(2.25rem,1.3rem+3vw,4rem)] leading-[1] font-semibold tracking-[-0.045em]">
              {copy.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="mt-5 max-w-[30rem] text-[0.9375rem] leading-relaxed text-white/55">{copy.lead}</p>
          </div>
          <div className="lg:col-span-4 lg:col-start-9 lg:text-right">
            <p className="text-[0.8125rem] text-white/45">{copy.note}</p>
            <Link href={copy.cta.href} className="group mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-white pr-2 pl-5 text-[0.875rem] font-semibold text-ink transition-transform duration-300 hover:-translate-y-0.5">
              {copy.cta.label}
              <span className="grid size-7 place-items-center rounded-full bg-ink text-white">
                <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>

        {/* Em degraus: cada rota começa um pouco mais alto que a anterior. */}
        <ol data-plans className="mt-16 grid gap-4 md:mt-24 md:grid-cols-3 md:items-start md:gap-0">
          {copy.items.map((plan, i) => (
            <li key={plan.name} data-plan className="relative border-white/10 md:border-l md:px-8 md:[--step:3.5rem] md:first:border-l-0 md:first:pl-0" style={{ marginTop: `calc(${2 - i} * var(--step, 0rem))` }}>
              <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:rounded-none md:bg-transparent md:p-0 md:ring-0">
                <span data-line aria-hidden="true" className="mb-6 block h-px w-full origin-left" style={{ background: `linear-gradient(90deg, ${BLUE}, transparent)` }} />
                <p className="font-mono text-[0.625rem] tracking-[0.14em] text-white/40 uppercase">{plan.tag}</p>
                <h3 className="mt-3 text-[clamp(1.75rem,1.3rem+1.2vw,2.5rem)] leading-none font-semibold tracking-[-0.04em]">{plan.name}</h3>
                <p className="mt-4 text-[0.875rem] leading-relaxed text-white/60">{plan.pitch}</p>
                <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[0.8125rem] leading-snug text-white/70">
                      <span className="mt-[0.55em] h-px w-3 shrink-0 bg-white/35" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={copy.cta.href} className="group mt-7 inline-flex items-center gap-2 text-[0.8125rem] font-medium text-white">
                  <MessageCircle className="size-3.5 text-white/60" aria-hidden="true" />
                  <span className="link-underline">{plan.cta}</span>
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
