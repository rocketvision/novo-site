import { Check, Sparkle } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { Resolved } from "@/lib/content/resolved";
import { cn } from "@/lib/utils";

type Content = Resolved<"services">;
type Service = Content["items"][number];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Serviços: o que a Rocket constrói, numa grade bento, todos visíveis de uma vez.
 *
 * Cada cartão tem uma ilustração do unDraw recolorida no azul da Rocket (o do motor do foguete
 * na abertura) e, sobre ela, o resultado do serviço como uma notificação. Sem scroll preso.
 */
export function Services({ services }: { services: Content }) {
  const items = services.items;
  return (
    <section id="servicos" aria-labelledby="servicos-titulo" className="bg-paper">
      <div className="container-page py-28 md:py-36">
        <Reveal className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow>{services.eyebrow}</Eyebrow>
            <h2 id="servicos-titulo" className="text-headline mt-6 text-ink">
              {services.title}
            </h2>
          </div>
          <p className="text-lead text-muted lg:col-span-4 lg:col-start-9">{services.lead}</p>
        </Reveal>

        <ul className="mt-14 grid gap-4 md:mt-16 md:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          {items.map((service, i) => {
            const span = spanOf(i, items.length);
            return (
              <Reveal as="li" key={service.id} delay={Math.min(i, 4) * 0.06} className={cn(span.lg, span.md)}>
                <ServiceCard service={service} index={i} wide={span.wide} />
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/**
 * Tamanho de cada cartão. Com quantidade ímpar, o primeiro vira uma faixa larga (texto e mini
 * interface lado a lado) e os demais formam pares; com quantidade par, todos em pares.
 */
function spanOf(i: number, n: number) {
  if (n % 2 === 1 && i === 0) return { lg: "lg:col-span-6", md: "md:col-span-2", wide: true };
  return { lg: "lg:col-span-3", md: "", wide: false };
}

function ServiceCard({ service, index, wide }: { service: Service; index: number; wide: boolean }) {
  return (
    <article
      aria-labelledby={`servico-${service.id}-titulo`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-mist ring-1 ring-black/[0.04] transition-[translate,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.25)]",
        wide && "lg:flex-row-reverse",
      )}
    >
      <div className={cn("relative h-60 shrink-0 overflow-hidden md:h-72", wide && "lg:h-auto lg:min-h-[24rem] lg:w-[58%]")} aria-hidden="true">
        <ServiceArt id={service.id} signal={service.signal} />
      </div>

      <div className={cn("flex flex-1 flex-col p-7 md:p-8", wide && "lg:justify-center lg:p-12")}>
        <p className="text-eyebrow text-muted">
          <span className="text-ink tabular-nums">{pad(index + 1)}</span>
          <span className="mx-2 text-black/20">/</span>
          {service.name}
        </p>
        <h3 id={`servico-${service.id}-titulo`} className={cn("mt-4 text-[1.375rem] leading-[1.15] font-semibold tracking-[-0.025em] text-ink", wide && "lg:text-[2rem] lg:leading-[1.08]")}>
          {service.title}
        </h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{service.what}</p>
        {/* Empurra os resultados para a base: os cartões da mesma linha ficam alinhados. */}
        <div className="flex-1" />
        <ul className="mt-6 space-y-2 border-t border-line pt-5">
          {service.outcomes.map((outcome, j) => (
            <li key={j} className="flex gap-2.5 text-[0.875rem] leading-snug text-graphite">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink" strokeWidth={2.25} />
              {outcome}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Ilustrações (unDraw), recoloridas no azul da Rocket: uma por serviço, pelo    */
/* identificador cadastrado no CMS.                                             */
/* -------------------------------------------------------------------------- */

const ILLUSTRATIONS: Record<string, string> = {
  sites: "sites",
  lojas: "lojas",
  "lojas-virtuais": "lojas",
  sistemas: "sistemas",
  aplicativos: "aplicativos",
  apps: "aplicativos",
  identidade: "identidade",
  "identidade-visual": "identidade",
};

function ServiceArt({ id, signal }: { id: string; signal: string }) {
  const file = ILLUSTRATIONS[id];
  return (
    <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_70%_15%,rgb(44_157_245/0.12),transparent_65%),linear-gradient(180deg,#f1f2f5,#e9eaee)]">
      {file ? (
        // SVG estático e leve: sem otimização de imagem (o Next não converte SVG).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/illustrations/${file}.svg`}
          alt=""
          loading="lazy"
          className="absolute inset-x-8 top-7 bottom-16 m-auto h-[calc(100%-5.75rem)] w-[calc(100%-4rem)] object-contain transition-transform duration-700 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid size-20 place-items-center rounded-2xl bg-white text-[#2c9df5] shadow-[0_20px_40px_-20px_rgb(0_0_0/0.3)] transition-transform duration-700 ease-out group-hover:rotate-6">
            <Sparkle className="size-8" strokeWidth={1.5} />
          </span>
        </div>
      )}
      <Signal text={signal} />
    </div>
  );
}

/** O resultado do serviço, como uma notificação que chega ao passar o mouse. */
function Signal({ text }: { text: string }) {
  return (
    <div className="absolute bottom-5 left-5 flex max-w-[calc(100%-2.5rem)] translate-y-1 items-center gap-2.5 rounded-full bg-white/90 py-1.5 pr-4 pl-1.5 text-[0.8125rem] font-medium text-ink opacity-90 shadow-[0_12px_30px_-12px_rgb(0_0_0/0.3)] backdrop-blur transition-[translate,opacity] duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-white">
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>
      <span className="truncate">{text}</span>
    </div>
  );
}
