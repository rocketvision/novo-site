"use client";

import { useRef, useState } from "react";
import { m, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/animations/reveal";
import type { Resolved } from "@/lib/content/resolved";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { insetClip, segment } from "@/lib/scroll";
import { cn } from "@/lib/utils";

type Content = Resolved<"services">;
type Service = Content["items"][number];

const pad = (n: number) => String(n).padStart(2, "0");

export function Services({ services }: { services: Content }) {
  const items = services.items;
  const reduceMotion = usePrefersReducedMotion();

  return (
    <section id="servicos" aria-labelledby="servicos-titulo" className="bg-paper">
      <div className="container-page grid gap-8 pt-28 pb-12 md:pt-40 lg:grid-cols-12 lg:items-end lg:pb-16">
        <Reveal className="lg:col-span-7">
          <Eyebrow>{services.eyebrow}</Eyebrow>
          <h2 id="servicos-titulo" className="text-headline mt-6 text-ink">
            {services.title}
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9">
          <p className="text-lead text-muted">{services.lead}</p>
          <Link href="/projetos" className="group mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink">
            <span className="link-underline">Ver projetos</span>
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </Reveal>
      </div>
      {reduceMotion ? (
        <ServicesStack items={items} />
      ) : (
        // As duas composições saem do servidor; o CSS escolhe pelo breakpoint, sem salto após carregar.
        <>
          <div className="hidden lg:block">
            <ServicesStage items={items} />
          </div>
          <div className="lg:hidden">
            <ServicesStack items={items} idSuffix="-m" />
          </div>
        </>
      )}
    </section>
  );
}

/** Palco fixo: a fotografia troca por cortina e o texto acompanha, serviço a serviço. */
function ServicesStage({ items }: { items: Service[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const total = items.length;
  const progress = useScrollProgress(ref, ["start start", "end end"]);
  const [active, setActive] = useState(0);
  useMotionValueEvent(progress, "change", (v) => setActive(Math.min(total - 1, Math.floor(v * total))));

  const goTo = (index: number) => {
    const el = ref.current;
    if (!el) return;
    const scrollable = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + ((index + 0.3) / total) * scrollable;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    // Altura proporcional ao número de serviços: com os 5 originais, 520vh.
    <div ref={ref} style={{ height: `${Math.round((total * 520) / 5)}vh` }} className="relative">
      <div className="sticky top-0 flex h-svh overflow-hidden">
        <div className="flex w-[40%] flex-col py-[calc(var(--header-height)+2rem)] pr-12 pl-[max(3rem,calc((100vw-80rem)/2+3rem))]">
          <nav aria-label="Serviços">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {items.map((service, i) => (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={active === i ? "true" : undefined}
                    className={cn(
                      "relative py-1 text-[0.8125rem] transition-colors duration-500",
                      active === i ? "text-ink" : "text-subtle hover:text-graphite",
                    )}
                  >
                    {service.name}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-0 h-px bg-accent transition-all duration-500 ease-out",
                        active === i ? "w-full" : "w-0",
                      )}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="relative mt-8 flex-1">
            {items.map((service, i) => (
              <ServiceCopy key={service.id} service={service} index={i} total={total} progress={progress} />
            ))}
          </div>
        </div>

        <div className="relative my-[calc(var(--header-height)+0.75rem)] flex-1 overflow-hidden rounded-l-[2rem] bg-mist">
          {items.map((service, i) => (
            <ServicePhoto key={service.id} service={service} index={i} total={total} progress={progress} />
          ))}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
          <p className="absolute top-8 right-10 font-mono text-xs text-white/85 tabular-nums mix-blend-difference" aria-hidden="true">
            {pad(active + 1)} / {pad(total)}
          </p>
        </div>
      </div>
    </div>
  );
}

function segmentOf(index: number, total: number) {
  const start = index / total;
  const end = (index + 1) / total;
  return { start, end, w: end - start, first: index === 0, last: index === total - 1 };
}

type SlideProps = { service: Service; index: number; total: number; progress: MotionValue<number> };

function ServiceCopy({ service, index, total, progress }: SlideProps) {
  const { start, end, w, first, last } = segmentOf(index, total);
  const opacity = useTransform(progress, [start, start + w * 0.16, end - w * 0.16, end], [first ? 1 : 0, 1, 1, last ? 1 : 0]);
  const y = useTransform(progress, [start, start + w * 0.2, end - w * 0.2, end], [first ? 0 : 48, 0, 0, last ? 0 : -48]);
  const outcomesOpacity = useTransform(progress, [start + w * 0.12, start + w * 0.3], [first ? 1 : 0, 1]);

  return (
    <m.article
      style={{ opacity, y }}
      aria-labelledby={`servico-${service.id}-titulo`}
      className="absolute inset-0 flex flex-col justify-center"
    >
      <p className="text-eyebrow text-muted">
        <span className="text-accent-strong tabular-nums">{pad(index + 1)}</span>
        <span className="mx-2 text-black/20">/</span>
        {service.name}
      </p>
      <h3 id={`servico-${service.id}-titulo`} className="text-title mt-5 text-ink">
        {service.title}
      </h3>
      <p className="text-body mt-5 text-muted">{service.problem}</p>
      <p className="text-body mt-3 text-graphite">{service.what}</p>
      <m.ul style={{ opacity: outcomesOpacity }} className="mt-7 space-y-2.5 border-t border-line pt-6">
        {service.outcomes.map((outcome, i) => (
          <li key={i} className="flex gap-3 text-[0.9375rem] text-graphite">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2.25} />
            {outcome}
          </li>
        ))}
      </m.ul>
    </m.article>
  );
}

function ServicePhoto({ service, index, total, progress }: SlideProps) {
  const { start, end, w } = segmentOf(index, total);
  // A foto seguinte entra da direita como uma cortina, com a câmera ainda se aproximando.
  const clipPath = useTransform(progress, (v) => {
    if (index === 0) return insetClip(0, 0, 0, 0);
    const t = segment(v, start - w * 0.28, start + w * 0.12);
    return insetClip(0, 0, 0, (1 - t) * 100);
  });
  const scale = useTransform(progress, [start - w * 0.28, end], [1.18, 1.02]);
  const signalOpacity = useTransform(progress, [start + w * 0.1, start + w * 0.25, end - w * 0.1, end], [index === 0 ? 1 : 0, 1, 1, 0]);
  const signalY = useTransform(progress, [start + w * 0.1, start + w * 0.25], [index === 0 ? 0 : 24, 0]);

  return (
    <m.div style={{ clipPath }} className="absolute inset-0">
      <m.div style={{ scale }} className="absolute inset-0">
        <Photo photo={service.image} sizes="60vw" />
      </m.div>
      <m.div style={{ opacity: signalOpacity, y: signalY }} className="absolute bottom-10 left-10 z-10">
        <Signal text={service.signal} />
      </m.div>
    </m.div>
  );
}

/** O resultado do serviço, como uma notificação discreta sobre a foto. */
function Signal({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-3 rounded-full bg-white/90 py-2.5 pr-5 pl-2.5 text-sm font-medium tracking-tight text-ink shadow-[0_20px_50px_-20px_rgb(0_0_0/0.5)] backdrop-blur-md">
      <span className="flex size-7 items-center justify-center rounded-full bg-ink text-white">
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>
      {text}
    </p>
  );
}

/** Mobile e reduced motion: cada serviço com a própria fotografia, em sequência. */
function ServicesStack({ items, idSuffix = "" }: { items: Service[]; idSuffix?: string }) {
  return (
    <div className="pb-24">
      {items.map((service, i) => (
        <article key={service.id} aria-labelledby={`servico-${service.id}-titulo${idSuffix}`} className="mt-14 first:mt-4 md:mt-24">
          <Reveal className="relative mx-4 aspect-[4/5] overflow-hidden rounded-[1.5rem] sm:mx-8 sm:aspect-[16/10]">
            <Photo photo={service.image} sizes="100vw" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-5 left-5">
              <Signal text={service.signal} />
            </div>
          </Reveal>
          <div className="container-page mt-8 max-w-2xl sm:mx-0">
            <p className="text-eyebrow text-muted">
              <span className="text-accent-strong tabular-nums">{pad(i + 1)}</span>
              <span className="mx-2 text-black/20">/</span>
              {service.name}
            </p>
            <h3 id={`servico-${service.id}-titulo${idSuffix}`} className="text-title mt-4 text-ink">
              {service.title}
            </h3>
            <p className="text-body mt-4 text-muted">{service.problem}</p>
            <p className="text-body mt-3 text-graphite">{service.what}</p>
            <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
              {service.outcomes.map((outcome, j) => (
                <li key={j} className="flex gap-3 text-[0.9375rem] text-graphite">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2.25} />
                  {outcome}
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </div>
  );
}
