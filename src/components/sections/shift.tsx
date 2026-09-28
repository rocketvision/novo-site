import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { shift } from "@/content/landing";

/**
 * Possibilidade: cada dor ganha, lado a lado, a versão resolvida.
 * O título fica fixo enquanto a lista avança.
 */
export function Shift() {
  return (
    <section aria-labelledby="shift-titulo" className="bg-ink pb-28 text-white md:pb-40" data-header="dark">
      <div className="container-page grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[calc(var(--header-height)+4rem)]">
            <Eyebrow className="text-white/50">{shift.eyebrow}</Eyebrow>
            <h2 id="shift-titulo" className="text-headline mt-6 max-w-xl">
              {shift.title}
            </h2>
          </div>
        </div>

        <ol className="lg:col-span-7 lg:pt-2">
          {shift.items.map((item, i) => (
            <Reveal as="li" key={item.before} className="group border-t border-white/10 py-8 last:border-b md:py-10">
              <div className="flex items-baseline gap-5 md:gap-8">
                <span aria-hidden="true" className="text-eyebrow w-6 shrink-0 text-white/35 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body text-white/55">
                    <span className="sr-only">Antes: </span>
                    <span className="line-through decoration-white/25">{item.before}</span>
                  </p>
                  <p className="text-title mt-3 flex items-start gap-3 text-white">
                    <ArrowRight
                      aria-hidden="true"
                      className="mt-[0.3em] size-[0.8em] shrink-0 text-accent transition-transform duration-500 ease-out group-hover:translate-x-1"
                    />
                    <span>
                      <span className="sr-only">Depois: </span>
                      {item.after}
                    </span>
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
