"use client";

import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { Check } from "lucide-react";
import type { Service } from "@/content/landing";
import { ServiceVisualArt } from "@/components/mockups/service-visuals";
import { ease, duration } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Sticky storytelling dos serviços.
 * Desktop: o texto rola à esquerda e o painel visual à direita permanece fixo,
 * trocando conforme o serviço em foco. Mobile: cada serviço traz o próprio visual.
 */
export function ServicesShowcase({ items }: { items: Service[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.index));
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const goTo = (index: number) => {
    refs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="container-page mt-14 grid gap-20 md:mt-20 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-5">
        {items.map((service, i) => (
          <article
            key={service.id}
            id={`servico-${service.id}`}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-index={i}
            aria-labelledby={`servico-${service.id}-titulo`}
            className={cn(
              "flex flex-col justify-center transition-opacity duration-700 ease-out lg:min-h-[78svh]",
              i > 0 && "mt-24 lg:mt-0",
              active === i ? "lg:opacity-100" : "lg:opacity-30",
            )}
          >
            <div className="mb-10 aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-mist p-6 xs:p-8 md:aspect-[16/10] md:p-12 lg:hidden">
              <ServiceVisualArt type={service.visual} />
            </div>

            <p className="text-eyebrow text-muted">
              <span className="text-accent-strong tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="mx-2 text-black/20">/</span>
              {service.name}
            </p>
            <h3 id={`servico-${service.id}-titulo`} className="text-title mt-5 text-ink">
              {service.title}
            </h3>

            <dl className="mt-8 max-w-2xl space-y-6">
              <div>
                <dt className="text-sm font-medium text-ink">O problema</dt>
                <dd className="text-body mt-1.5 text-muted">{service.problem}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-ink">O que fazemos</dt>
                <dd className="text-body mt-1.5 text-muted">{service.what}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-ink">O que você ganha</dt>
                <dd>
                  <ul className="mt-3 space-y-2.5">
                    {service.outcomes.map((outcome) => (
                      <li key={outcome} className="text-body flex gap-3 text-graphite">
                        <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent" strokeWidth={2.25} />
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div aria-hidden="true" className="hidden lg:col-span-7 lg:block">
        <div className="sticky top-[calc(var(--header-height)+1.5rem)] flex h-[calc(100svh-var(--header-height)-3rem)] max-h-[52rem] flex-col rounded-[2rem] bg-mist p-8 xl:p-12">
          <div className="flex items-center justify-between">
            <p className="text-eyebrow text-muted">
              <span className="text-ink tabular-nums">{String(active + 1).padStart(2, "0")}</span>
              <span className="mx-1.5">/</span>
              <span className="tabular-nums">{String(items.length).padStart(2, "0")}</span>
            </p>
            <div className="flex gap-1.5">
              {items.map((service, i) => (
                <button
                  key={service.id}
                  type="button"
                  tabIndex={-1}
                  onClick={() => goTo(i)}
                  className="group/dot flex h-6 items-center"
                >
                  <span
                    className={cn(
                      "block h-1 rounded-full transition-all duration-500 ease-out",
                      active === i ? "w-8 bg-ink" : "w-4 bg-black/15 group-hover/dot:bg-black/30",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-8 flex-1">
            {items.map((service, i) => (
              <m.div
                key={service.id}
                className="absolute inset-0 px-4"
                initial={false}
                animate={{
                  opacity: active === i ? 1 : 0,
                  scale: active === i ? 1 : 0.96,
                  y: active === i ? 0 : i < active ? -24 : 24,
                }}
                transition={{ duration: duration.base, ease: ease.out }}
                style={{ pointerEvents: active === i ? "auto" : "none" }}
              >
                <ServiceVisualArt type={service.visual} />
              </m.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
