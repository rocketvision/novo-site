"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Globe, LayoutDashboard, PenTool, ShoppingBag, Smartphone, Sparkle } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { RocketVideo } from "@/components/ui/rocket-video";
import type { Resolved } from "@/lib/content/resolved";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { site } from "@/lib/site";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

type Content = {
  hero: Resolved<"hero">;
  services: Resolved<"services">;
};

/** Ícone de traço para cada serviço, pelo identificador. */
const SERVICE_ICONS: Record<string, typeof Globe> = {
  sites: Globe,
  lojas: ShoppingBag,
  "lojas-virtuais": ShoppingBag,
  sistemas: LayoutDashboard,
  aplicativos: Smartphone,
  apps: Smartphone,
  identidade: PenTool,
  "identidade-visual": PenTool,
};

/**
 * Abertura: uma tela só. O lançamento do foguete ocupa a tela inteira, em loop, e por cima,
 * direto sobre o vídeo, a assinatura da marca, a promessa e os dois caminhos. No rodapé, discretos,
 * o que a Rocket constrói. A palavra ROCKET quase apagada dá textura
 * sem competir com o foguete. Tudo entra uma única vez, em cascata.
 * O vídeo pausa quando a abertura sai da tela.
 */
export function HeroScene({ hero, services }: Content) {
  const reduceMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id="inicio" data-header="dark" className="relative overflow-hidden bg-ink">
      <HeroMedia play={visible && !reduceMotion} still={reduceMotion} />
      <HeroContent hero={hero} services={services} />
    </section>
  );
}

/** "muda o *rumo*": o trecho entre asteriscos vira a palavra em serifa itálica. */
function TitleLine({ line }: { line: string }) {
  return line.split(/(\*[^*]+\*)/).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
      <em key={i} className="font-serif font-normal tracking-[-0.01em] italic">
        {part.slice(1, -1)}
      </em>
    ) : (
      part
    ),
  );
}

/** Fundo da abertura: o vídeo e a máscara que protege a leitura sem apagar a cena. */
function HeroMedia({ play, still = false }: { play: boolean; still?: boolean }) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <RocketVideo play={play} still={still} />
      {/* O foguete sobe no centro-direita e o fim do vídeo é um mar de nuvens claras: a máscara
          pesa à esquerda e embaixo, onde está o texto, e some sobre o foguete. No celular o texto
          fica embaixo, então a máscara sobe do rodapé. O topo escurece de leve para o menu. */}
      {/* Vinheta: as bordas afundam no escuro e o foguete ganha profundidade. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_62%_45%,transparent_55%,rgb(3_5_9/0.55)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(5_7_11/0.86)_0%,rgb(5_7_11/0.62)_28%,rgb(5_7_11/0.18)_52%,rgb(5_7_11/0)_68%),linear-gradient(0deg,rgb(5_7_11/0.72)_0%,rgb(5_7_11/0.2)_30%,transparent_50%),linear-gradient(180deg,rgb(5_7_11/0.5)_0%,transparent_18%)] max-md:bg-[linear-gradient(180deg,rgb(5_7_11/0.55)_0%,rgb(5_7_11/0)_20%,rgb(5_7_11/0)_32%,rgb(5_7_11/0.62)_50%,rgb(5_7_11/0.9)_70%,rgb(5_7_11/0.96)_100%)]" />
    </div>
  );
}

function HeroContent({ hero, services }: Content) {
  // Telas baixas (celular deitado): tudo mais compacto para os botões caberem na primeira dobra.
  return (
    <div className="container-page relative flex min-h-svh flex-col pt-[calc(var(--header-height)+2rem)] pb-6 md:pb-8 [@media(max-height:560px)]:pt-[calc(var(--header-height)+0.5rem)] [@media(max-height:560px)]:pb-4">
      <div className="flex flex-1 flex-col justify-end md:justify-center">
        <div className="max-w-[48rem]">
          <p className="animate-fade-in flex w-fit items-center gap-2.5 border-t border-white/[0.12] pt-3 text-eyebrow text-white/70" style={delay(0)}>
            <LogoMark className="size-5 flex-none text-accent" />
            <span>
              {site.name} <span className="text-white/40">—</span> {site.slogan}
            </span>
          </p>

          <h1 className="text-hero mt-5 max-w-[6.2em] text-white [text-shadow:0_4px_32px_rgb(0_0_0/0.35)] max-sm:text-[clamp(2.5rem,11.5vw,3.25rem)] md:mt-6 [@media(max-height:560px)]:mt-3">
            {hero.titleLines.map((line, i) => (
              <span key={i} className="animate-headline block" style={delay(140 + i * 90)}>
                <TitleLine line={line} />
              </span>
            ))}
          </h1>

          <p className="animate-fade-up mt-6 max-w-[30rem] text-[1.0625rem] leading-[1.6] text-white/75 md:mt-7 md:text-lg [@media(max-height:560px)]:mt-3 [@media(max-height:560px)]:text-[0.9375rem] [@media(max-height:560px)]:leading-normal" style={delay(520)}>
            {hero.lead}
          </p>

          <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-3 md:mt-10 [@media(max-height:560px)]:mt-4" style={delay(720)}>
            <Link
              href={hero.primaryCta.href}
              className="group inline-flex h-13 items-center gap-3 rounded-full bg-[linear-gradient(96deg,var(--color-accent)_0%,var(--color-accent-soft)_100%)] py-1.5 pr-1.5 pl-6 text-base font-semibold tracking-[-0.01em] whitespace-nowrap text-white shadow-[0_14px_40px_rgb(255_91_31/0.32)] transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgb(255_91_31/0.46)] active:translate-y-0 active:scale-[0.98] max-[400px]:w-full max-[400px]:justify-between"
            >
              {hero.primaryCta.label}
              <span className="grid size-10 place-items-center rounded-full bg-white text-ink" aria-hidden="true">
                <ArrowRight className="size-[1.1rem] transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              href={hero.secondaryCta.href}
              className={buttonClasses({
                variant: "secondary",
                size: "lg",
                className:
                  "bg-white/[0.04] text-white ring-white/25 backdrop-blur-md hover:bg-white/[0.08] hover:text-white hover:ring-white/50 max-[400px]:w-full",
              })}
            >
              <span>{hero.secondaryCta.label}</span>
              <ArrowUpRight
                className="-mr-1 size-4 transition-transform duration-300 ease-out group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* Rodapé da abertura: a palavra da marca quase apagada e o que a Rocket constrói. */}
      <div className="animate-fade-up relative mt-10 flex items-end justify-between gap-6 max-md:mt-7 [@media(max-height:560px)]:hidden" style={delay(900)}>
        <span className="text-[clamp(3rem,8vw,7rem)] leading-[0.8] font-bold tracking-[-0.05em] text-white/[0.05] select-none max-lg:hidden" aria-hidden="true">
          ROCKET
        </span>
        <div className="min-w-0 border-t border-white/[0.12] pt-4">
          <ul className="flex flex-wrap items-center gap-x-[clamp(14px,2.2vw,32px)] gap-y-2 lg:justify-end" aria-label="O que a Rocket constrói">
            {services.items.map((service) => {
              const Icon = SERVICE_ICONS[service.id] ?? Sparkle;
              return (
                <li key={service.id} className="inline-flex items-center gap-[7px] text-[13px] tracking-[-0.01em] text-white/80 md:text-[15px]">
                  <Icon className="size-4 text-white/60 md:size-[17px]" strokeWidth={1.5} aria-hidden="true" />
                  {service.name}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
