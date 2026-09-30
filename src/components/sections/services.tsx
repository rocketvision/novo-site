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
 * Cada cartão tem uma mini interface desenhada em código que mostra o serviço funcionando
 * (o site recebendo um contato, a loja confirmando um pedido, o painel gerando o relatório...).
 * Ao passar o mouse, ela ganha vida. Sem scroll preso: a seção cabe em pouco mais de uma tela.
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
          <span className="text-accent-strong tabular-nums">{pad(index + 1)}</span>
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
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2.25} />
              {outcome}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Mini interfaces: uma por serviço, pelo identificador cadastrado no CMS.      */
/* -------------------------------------------------------------------------- */

function ServiceArt({ id, signal }: { id: string; signal: string }) {
  const Art = ARTS[id] ?? GenericArt;
  return (
    <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_75%_10%,rgb(255_91_31/0.10),transparent_60%),linear-gradient(180deg,#eeeef1,#e7e7eb)]">
      <Art />
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

const line = "rounded-full bg-black/[0.08]";

/** Sites: uma página no navegador; o botão acende e o formulário recebe um contato. */
function SiteArt() {
  return (
    <div className="absolute inset-x-6 top-6 bottom-20 flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_-20px_rgb(0_0_0/0.25)] ring-1 ring-black/5 transition-transform duration-700 ease-out group-hover:-translate-y-1 md:inset-x-8 md:top-8">
      <div className="flex items-center gap-1.5 border-b border-black/5 px-3 py-2">
        <span className="size-2 rounded-full bg-black/10" />
        <span className="size-2 rounded-full bg-black/10" />
        <span className="size-2 rounded-full bg-black/10" />
        <span className="ml-3 h-4 flex-1 rounded-full bg-black/[0.04] px-2 text-[9px] leading-4 text-black/35">suaempresa.com.br</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
        {/* Destaque: título, texto, botão e a imagem da página. */}
        <div className="grid flex-1 grid-cols-[1.1fr_1fr] gap-4">
          <div className="flex flex-col justify-center space-y-2.5">
            <div className="h-3 w-[85%] rounded-full bg-ink/85" />
            <div className="h-3 w-[60%] rounded-full bg-ink/85" />
            <div className={cn(line, "mt-2 h-1.5 w-[90%]")} />
            <div className={cn(line, "h-1.5 w-[70%]")} />
            <div className="mt-3 h-6 w-24 rounded-full bg-accent shadow-[0_6px_16px_-6px_rgb(255_91_31/0.8)] transition-transform duration-500 group-hover:scale-105" />
          </div>
          <div className="min-h-20 rounded-lg bg-[radial-gradient(80%_80%_at_70%_20%,#ffb08a,#ff5b1f_45%,#2a0b02)] transition-[filter] duration-700 group-hover:saturate-150" />
        </div>
        {/* Três blocos de conteúdo e o formulário de contato. */}
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2].map((k) => (
            <div key={k} className="space-y-1.5 rounded-md bg-mist p-2">
              <span className="block size-3 rounded bg-black/10" />
              <span className={cn(line, "block h-1 w-3/4")} />
              <span className={cn(line, "block h-1 w-1/2")} />
            </div>
          ))}
          <div className="space-y-1 rounded-md bg-mist p-2">
            <span className="block h-2.5 rounded bg-white ring-1 ring-black/5" />
            <span className="block h-2.5 rounded bg-white ring-1 ring-black/5" />
            <span className="block h-2.5 rounded bg-ink/85 transition-colors duration-500 group-hover:bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Lojas virtuais: a vitrine com produto, preço e o botão de compra. */
function StoreArt() {
  return (
    <div className="absolute inset-x-0 top-6 flex items-start justify-center gap-3 px-6">
      {[0, 1].map((k) => (
        <div
          key={k}
          className={cn(
            "w-[36%] max-w-[8rem] rounded-xl bg-white p-2 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.3)] ring-1 ring-black/5 transition-transform duration-700 ease-out",
            k === 0 ? "group-hover:-translate-y-1.5 group-hover:-rotate-2" : "mt-5 group-hover:translate-y-1 group-hover:rotate-2",
          )}
        >
          <div className={cn("aspect-square rounded-lg", k === 0 ? "bg-[linear-gradient(140deg,#ffd9c7,#ff8a5c)]" : "bg-[linear-gradient(140deg,#dfe3ea,#b9c1cf)]")} />
          <div className={cn(line, "mt-2.5 h-1.5 w-3/4")} />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-ink">R$ {k === 0 ? "189" : "129"}</span>
            <span className="h-4 w-9 rounded-full bg-ink/85 transition-colors duration-500 group-hover:bg-accent" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Sistemas: um painel com indicadores e barras que sobem com os dados. */
function SystemArt() {
  const bars = [38, 52, 44, 66, 58, 80, 72];
  return (
    <div className="absolute inset-x-6 top-6 bottom-16 flex overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_-20px_rgb(0_0_0/0.25)] ring-1 ring-black/5">
      <div className="w-8 space-y-2 border-r border-black/5 bg-mist/60 p-2 pt-3">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className={cn("mx-auto size-3 rounded", k === 1 ? "bg-accent/80" : "bg-black/10")} />
        ))}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="grid grid-cols-2 gap-2">
          {["+24%", "1.284"].map((v) => (
            <div key={v} className="rounded-md bg-mist px-2 py-1.5">
              <div className={cn(line, "h-1 w-1/2")} />
              <p className="mt-1 text-[11px] font-semibold tracking-tight text-ink tabular-nums">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-1 items-end gap-1.5">
          {bars.map((h, k) => (
            // Ao passar o mouse, cada barra sobe da metade até a altura cheia, uma depois da outra.
            <div
              key={k}
              style={{ "--h": `${h}%`, transitionDelay: `${k * 45}ms` } as React.CSSProperties}
              className={cn(
                "h-[calc(var(--h)*0.55)] flex-1 rounded-t-[3px] transition-[height] duration-700 ease-out group-hover:h-(--h)",
                k === bars.length - 2 ? "bg-accent" : "bg-ink/80",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Aplicativos: um celular com a agenda; a notificação desce ao passar o mouse. */
function AppArt() {
  return (
    <div className="absolute inset-x-0 top-5 flex justify-center">
      <div className="relative h-[15rem] w-[7.75rem] rounded-[1.4rem] bg-ink p-1.5 shadow-[0_24px_50px_-20px_rgb(0_0_0/0.45)] transition-transform duration-700 ease-out group-hover:-translate-y-1.5">
        <div className="h-full overflow-hidden rounded-[1.05rem] bg-white">
          <div className="mx-auto mt-1.5 h-1.5 w-8 rounded-full bg-black/80" />
          <div className="relative mx-2 -mt-1 -translate-y-6 rounded-lg bg-mist p-1.5 opacity-0 ring-1 ring-black/5 transition-[translate,opacity] duration-500 ease-out group-hover:translate-y-2 group-hover:opacity-100">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-accent" />
              <span className={cn(line, "h-1 flex-1")} />
            </div>
            <div className={cn(line, "mt-1 h-1 w-3/4")} />
          </div>
          <div className="space-y-1.5 px-2.5 pt-1">
            <div className="h-2 w-1/2 rounded-full bg-ink/80" />
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="flex items-center gap-1.5 rounded-md bg-mist p-1.5">
                <span className={cn("size-4 rounded-md", k === 0 ? "bg-accent/85" : "bg-black/10")} />
                <span className="flex-1 space-y-1">
                  <span className={cn(line, "block h-1 w-3/4")} />
                  <span className={cn(line, "block h-1 w-1/2")} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Identidade visual: um símbolo, a paleta e a tipografia da marca. */
function BrandArt() {
  return (
    <div className="absolute inset-x-6 top-6 bottom-16 grid grid-cols-[1.1fr_1fr] gap-3">
      <div className="grid place-items-center rounded-xl bg-ink shadow-[0_20px_50px_-20px_rgb(0_0_0/0.35)] transition-transform duration-700 ease-out group-hover:-translate-y-1">
        <span className="grid size-14 place-items-center rounded-full border-2 border-white/90 font-serif text-3xl text-white italic transition-transform duration-700 ease-out group-hover:rotate-[-8deg]">
          a
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-1 overflow-hidden rounded-xl ring-1 ring-black/5">
          {["bg-accent", "bg-ink", "bg-[#d9d6cf]", "bg-white"].map((c, k) => (
            <span key={c} className={cn("flex-1 transition-[flex-grow] duration-500 ease-out", c, k === 0 && "group-hover:grow-[2.2]")} />
          ))}
        </div>
        <div className="flex flex-1 items-end justify-between rounded-xl bg-white px-3 pb-2 ring-1 ring-black/5">
          <span className="font-serif text-4xl leading-none text-ink">Aa</span>
          <span className="pb-1 text-[9px] text-black/40">Serif · Sans</span>
        </div>
      </div>
    </div>
  );
}

/** Para serviços novos, cadastrados no CMS sem uma mini interface própria. */
function GenericArt() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <span className="grid size-20 place-items-center rounded-2xl bg-white text-accent shadow-[0_20px_40px_-20px_rgb(0_0_0/0.3)] transition-transform duration-700 ease-out group-hover:rotate-6">
        <Sparkle className="size-8" strokeWidth={1.5} />
      </span>
    </div>
  );
}

const ARTS: Record<string, () => React.ReactElement> = {
  sites: SiteArt,
  lojas: StoreArt,
  "lojas-virtuais": StoreArt,
  sistemas: SystemArt,
  aplicativos: AppArt,
  apps: AppArt,
  identidade: BrandArt,
  "identidade-visual": BrandArt,
};
