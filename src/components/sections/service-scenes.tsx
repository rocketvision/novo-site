"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Check, Search, ShoppingBag } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { scenes, servicesIntro as intro } from "@/content/landing-scenes";
import type { Resolved } from "@/lib/content/resolved";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type Service = Resolved<"services">["items"][number];
export type SiteTile = { src: string; position: string };

const SCENE_IDS = { sites: "sites", lojas: "lojas", "lojas-virtuais": "lojas", sistemas: "sistemas", aplicativos: "aplicativos", apps: "aplicativos" } as const;
type SceneId = (typeof SCENE_IDS)[keyof typeof SCENE_IDS];

const pad = (n: number) => String(n).padStart(2, "0");
const BLUE = "#2c9df5";

/**
 * Serviços: uma abertura e uma cena presa ao scroll para cada serviço, com o texto vindo do CMS.
 * Sites: a palavra SITES recortada sobre páginas reais, que se abre num mosaico de projetos.
 * Lojas: a loja vendendo de madrugada. Sistemas: o caos de planilhas vira um painel.
 * Aplicativos: o app do cliente chega na tela do celular, notifica e abre.
 * Serviços sem cena (ex.: identidade visual) não entram aqui; continuam no rodapé da abertura.
 */
export function ServiceScenes({ services, tiles }: { services: Resolved<"services">; tiles: SiteTile[] }) {
  const items = services.items.flatMap((service) => {
    const scene = SCENE_IDS[service.id as keyof typeof SCENE_IDS];
    return scene ? [{ service, scene }] : [];
  });

  return (
    <section id="servicos" aria-labelledby="servicos-titulo" data-header="dark" className="relative bg-ink text-white">
      <div className="relative overflow-hidden">
        <span aria-hidden="true" className="pointer-events-none absolute -top-[8vw] right-[4vw] text-[min(80vw,64rem)] leading-none font-bold tracking-[-0.06em] text-white/[0.025] select-none">
          V
        </span>
        <div className="container-page relative flex min-h-[80svh] flex-col justify-center py-28">
          <Reveal>
            <p className="text-eyebrow text-white/45">{intro.label}</p>
            <h2 id="servicos-titulo" className="mt-6 text-[clamp(2.5rem,1.2rem+4.4vw,5.5rem)] leading-[0.95] font-semibold tracking-[-0.05em]">
              {intro.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="mt-7 max-w-[26rem] text-[0.9375rem] leading-relaxed text-white/55">{intro.lead}</p>
          </Reveal>
        </div>
      </div>

      {items.map(({ service, scene }, i) => {
        const Scene = SCENES[scene];
        return <Scene key={service.id} service={service} index={i} tiles={tiles} />;
      })}
    </section>
  );
}

type SceneProps = { service: Service; index: number; tiles: SiteTile[] };

const SCENES: Record<SceneId, (props: SceneProps) => React.ReactNode> = {
  sites: SitesScene,
  lojas: StoreScene,
  sistemas: SystemsScene,
  aplicativos: AppScene,
};

/** Cena presa ao scroll: o invólucro alto dá a distância, o palco fica parado na tela. */
function useScene(build: (tl: gsap.core.Timeline, q: (selector: string) => HTMLElement[]) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const q = gsap.utils.selector(ref) as (selector: string) => HTMLElement[];
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      build(tl, q);
    },
    { scope: ref },
  );
  return ref;
}

function Stage({ stageRef, height = 300, children, className }: { stageRef: React.Ref<HTMLDivElement>; height?: number; children: React.ReactNode; className?: string }) {
  return (
    <div ref={stageRef} className="relative" style={{ height: `${height}svh` }}>
      <div className={cn("sticky top-0 h-svh overflow-hidden", className)}>{children}</div>
    </div>
  );
}

/** O texto de cada serviço, do CMS: número, nome, título, descrição, resultados e o convite. */
function SceneText({ service, index, className }: { service: Service; index: number; className?: string }) {
  return (
    <div data-text className={cn("max-w-[24rem]", className)}>
      <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-white/45 uppercase">
        <span className="text-white tabular-nums">{pad(index + 1)}</span>
        <span className="mx-2 text-white/20">/</span>
        {service.name}
      </p>
      <h3 className="mt-4 text-[clamp(1.625rem,1.1rem+2vw,3rem)] leading-[1.02] font-semibold tracking-[-0.04em]">{service.title}</h3>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/60 max-lg:line-clamp-3 max-lg:text-[0.875rem]">{service.what}</p>
      <ul className="mt-5 space-y-2 max-lg:hidden">
        {service.outcomes.slice(0, 3).map((outcome, j) => (
          <li key={j} className="flex gap-2.5 text-[0.8125rem] leading-snug text-white/70">
            <span className="mt-[0.55em] h-px w-3 shrink-0 bg-white/40" aria-hidden="true" />
            {outcome}
          </li>
        ))}
      </ul>
      <Link
        href="#contato"
        className="group mt-7 inline-flex h-10 max-lg:mt-5 items-center gap-2 rounded-full bg-white/[0.06] px-4 text-[0.8125rem] font-medium text-white ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/[0.12]"
      >
        {intro.more}
        <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function SampleNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[0.625rem] tracking-[0.14em] text-white/30 uppercase", className)}>( {children} )</p>;
}

/* -------------------------------------------------------------------------- */
/* Sites: SITES recortado sobre páginas reais, que se abre num mosaico.         */
/* -------------------------------------------------------------------------- */

function SitesScene({ service, index, tiles }: SceneProps) {
  const ref = useScene((tl, q) => {
    tl.fromTo(q("[data-word]"), { scale: 1 }, { scale: 1.08, duration: 0.3, ease: "none" }, 0)
      .fromTo(q("[data-grid]"), { scale: 1.9, yPercent: 6 }, { scale: 1.55, yPercent: 0, duration: 0.3, ease: "none" }, 0)
      // A palavra cresce até sumir pelas bordas: o recorte vira a tela inteira.
      .to(q("[data-word]"), { scale: 14, duration: 0.35, ease: "power2.in" }, 0.3)
      .to(q("[data-knockout]"), { opacity: 0, duration: 0.12 }, 0.53)
      .to(q("[data-grid]"), { scale: 1, duration: 0.35 }, 0.45)
      .fromTo(q("[data-dim]"), { opacity: 0 }, { opacity: 1, duration: 0.15 }, 0.72)
      .fromTo(q("[data-text]"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.15, ease: "power3.out" }, 0.78)
      .to({}, { duration: 0.15 });
  });
  const list = Array.from({ length: 16 }, (_, i) => tiles[i % Math.max(tiles.length, 1)]).filter(Boolean);

  return (
    <Stage stageRef={ref} height={320}>
      <div data-grid className="absolute inset-[-6%] grid origin-center grid-cols-4 gap-[1.2vw] p-[1.2vw] max-md:grid-cols-3">
        {list.map((tile, i) => (
          <div key={i} className="relative overflow-hidden rounded-[clamp(4px,0.6vw,10px)] bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element -- faixas já otimizadas, recortadas por object-position */}
            <img src={tile.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" style={{ objectPosition: tile.position }} />
          </div>
        ))}
      </div>
      {/* Recorte: preto com a palavra em branco, multiplicado sobre o mosaico, mostra as páginas só dentro das letras. */}
      <div data-knockout aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black mix-blend-multiply">
        <span data-word className="block text-[clamp(6rem,27vw,30rem)] leading-none font-black tracking-[-0.06em] text-white">
          {scenes.sites.word}
        </span>
      </div>
      <div data-dim className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,rgb(10_10_11/0.72),rgb(10_10_11/0.9))]" />
      <div className="absolute inset-0 grid place-items-center px-4">
        <SceneText service={service} index={index} className="max-w-[28rem] text-center [&_li]:justify-center [&_ul]:inline-block [&_ul]:text-left" />
      </div>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */
/* Sistemas: o caos de planilhas e bilhetes vira um painel.                     */
/* -------------------------------------------------------------------------- */

const NOTE_SPOTS = [
  { x: -34, y: -30, r: -8 },
  { x: 22, y: -34, r: 6 },
  { x: -8, y: -8, r: -3 },
  { x: 34, y: 2, r: 9 },
  { x: -36, y: 14, r: 5 },
  { x: 10, y: 26, r: -7 },
  { x: -18, y: 34, r: 4 },
  { x: 36, y: 32, r: -5 },
];

function SystemsScene({ service, index }: SceneProps) {
  const copy = scenes.sistemas;
  const ref = useScene((tl, q) => {
    const notes = q("[data-note]");
    tl.fromTo(
      notes,
      { opacity: 0, scale: 0.6, x: (i: number) => NOTE_SPOTS[i % 8].x * 2 + "vw", y: (i: number) => NOTE_SPOTS[i % 8].y * 2 + "vh", rotation: (i: number) => NOTE_SPOTS[i % 8].r * 3 },
      { opacity: 1, scale: 1, x: (i: number) => NOTE_SPOTS[i % 8].x + "vw", y: (i: number) => NOTE_SPOTS[i % 8].y + "vh", rotation: (i: number) => NOTE_SPOTS[i % 8].r, stagger: 0.02, duration: 0.25, ease: "power3.out" },
      0,
    )
      .to(notes, { x: (i: number) => NOTE_SPOTS[i % 8].x * 1.1 + "vw", rotation: (i: number) => NOTE_SPOTS[i % 8].r * 1.6, duration: 0.15, ease: "none" }, 0.25)
      // Os bilhetes são sugados para o painel e somem enquanto ele se monta.
      .to(notes, { x: "14vw", y: "2vh", scale: 0.2, rotation: 0, opacity: 0, stagger: 0.015, duration: 0.2, ease: "power2.in" }, 0.42)
      .fromTo(q("[data-card]"), { opacity: 0, y: 40, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, stagger: 0.03, duration: 0.18, ease: "power3.out" }, 0.5)
      .fromTo(q("[data-bar]"), { scaleY: 0 }, { scaleY: 1, stagger: 0.012, duration: 0.15, ease: "power3.out" }, 0.62)
      .fromTo(q("[data-text]"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.15, ease: "power3.out" }, 0.55)
      .to({}, { duration: 0.15 });
  });
  const d = copy.dashboard;
  const bars = [38, 52, 44, 61, 57, 70, 66, 82, 74, 96];

  return (
    <Stage stageRef={ref} height={300}>
      <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
        {copy.notes.map((note) => (
          <span key={note} data-note className="absolute rounded-[3px] bg-[#d9d9dc] px-[clamp(0.75rem,1.4vw,1.25rem)] py-[clamp(0.9rem,1.8vw,1.75rem)] font-mono text-[clamp(0.625rem,0.8vw,0.8125rem)] text-black/70 shadow-[0_20px_40px_-12px_rgb(0_0_0/0.8)]">
            {note}
          </span>
        ))}
      </div>

      <div className="container-page relative grid h-full content-center gap-10 pt-[var(--header-height)] lg:grid-cols-12 lg:items-center">
        <SceneText service={service} index={index} className="lg:col-span-4" />
        <div className="lg:col-span-7 lg:col-start-6" aria-hidden="true">
          <div className="grid grid-cols-3 gap-2.5 text-[0.75rem] sm:gap-3">
            <div data-card className="col-span-1 rounded-xl bg-white/[0.045] p-3 ring-1 ring-white/10 sm:p-4">
              <p className="text-white/45">{d.revenue.label}</p>
              <p className="mt-2 text-[1.125rem] font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums sm:text-[1.5rem]">{d.revenue.value}</p>
              <p className="mt-1 text-[0.6875rem]" style={{ color: BLUE }}>
                {d.revenue.delta}
              </p>
            </div>
            <div data-card className="rounded-xl bg-white/[0.045] p-3 ring-1 ring-white/10 sm:p-4">
              <p className="text-white/45">{d.orders.label}</p>
              <p className="mt-2 text-[1.25rem] font-semibold whitespace-nowrap tabular-nums sm:text-[1.5rem]">{d.orders.value}</p>
            </div>
            <div data-card className="rounded-xl bg-white/[0.045] p-3 ring-1 ring-white/10 sm:p-4">
              <p className="text-white/45">{d.ticket.label}</p>
              <p className="mt-2 text-[1.25rem] font-semibold whitespace-nowrap tabular-nums sm:text-[1.5rem]">{d.ticket.value}</p>
            </div>
            <div data-card className="col-span-3 rounded-xl bg-white/[0.045] p-3 ring-1 ring-white/10 sm:p-4 lg:col-span-2">
              <p className="text-white/45">{d.chart}</p>
              <div className="mt-4 flex h-16 items-end gap-1.5 sm:h-36">
                {bars.map((h, i) => (
                  <span
                    key={i}
                    data-bar
                    className="flex-1 origin-bottom rounded-[3px]"
                    style={{ height: `${h}%`, background: i === bars.length - 1 ? BLUE : "rgb(255 255 255 / 0.16)" }}
                  />
                ))}
              </div>
            </div>
            <div data-card className="col-span-3 flex flex-col gap-3 rounded-xl max-lg:hidden bg-white/[0.045] p-4 ring-1 ring-white/10 sm:col-span-1">
              <div>
                <p className="flex items-center gap-1.5 text-white/45">
                  <span className="size-1.5 rounded-full" style={{ background: BLUE }} />
                  {d.stock.label}
                </p>
                <p className="mt-2 text-[1.25rem] font-semibold">{d.stock.value}</p>
              </div>
              <ul className="space-y-1.5 border-t border-white/10 pt-3 text-[0.6875rem]">
                {d.recent.map((r) => (
                  <li key={r.who} className="flex justify-between gap-2 text-white/60">
                    <span>{r.who}</span>
                    <span className="tabular-nums text-white">{r.value}</span>
                    <span className="text-white/35">{r.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <SampleNote className="mt-4 text-right">{copy.sample}</SampleNote>
        </div>
      </div>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */
/* Lojas virtuais: a loja vendendo enquanto o dono dorme.                       */
/* -------------------------------------------------------------------------- */

function StoreScene({ service, index }: SceneProps) {
  const copy = scenes.lojas;
  const ref = useScene((tl, q) => {
    const orders = q("[data-order]");
    const clocks = q("[data-clock]");
    tl.fromTo(q("[data-headline]"), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.12, ease: "power3.out" }, 0)
      .fromTo(q("[data-glow]"), { opacity: 0.2, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: "none" }, 0)
      .to(q("[data-headline]"), { opacity: 0, y: -40, duration: 0.1 }, 0.24)
      .fromTo(q("[data-phone]"), { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.14, ease: "power3.out" }, 0.28)
      .fromTo(q("[data-text]"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.12, ease: "power3.out" }, 0.3);
    // Cada pedido chega com o seu horário, e o relógio grande ao fundo acompanha.
    orders.forEach((order, i) => {
      const at = 0.42 + i * 0.1;
      tl.fromTo(order, { opacity: 0, y: -24, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.07, ease: "back.out(1.6)" }, at);
      if (i > 0) tl.to(clocks[i - 1], { opacity: 0, yPercent: -30, duration: 0.05 }, at);
      tl.fromTo(clocks[i], { opacity: 0, yPercent: 30 }, { opacity: 1, yPercent: 0, duration: 0.05 }, at);
    });
    tl.to({}, { duration: 0.12 });
  });

  return (
    <Stage stageRef={ref} height={300} className="bg-[radial-gradient(90%_70%_at_70%_40%,#0b1a2b_0%,var(--color-ink)_65%)]">
      <div data-glow aria-hidden="true" className="absolute top-[18%] right-[12%] size-[38vw] rounded-full bg-[radial-gradient(circle,rgb(44_157_245/0.18),transparent_65%)] blur-2xl" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-[6%] grid place-items-center">
        {copy.orders.map((o) => (
          <span key={o.time} data-clock className="col-start-1 row-start-1 text-[clamp(5rem,22vw,20rem)] leading-none font-semibold tracking-[-0.06em] text-white/[0.04] tabular-nums opacity-0">
            {o.time}
          </span>
        ))}
      </div>

      <div data-headline className="absolute inset-0 grid place-items-center px-4 text-center">
        <div>
          <p className="text-[clamp(2.25rem,1rem+4vw,4.5rem)] leading-[1] font-semibold tracking-[-0.045em]">{copy.headline}</p>
          <p className="mx-auto mt-5 max-w-[30rem] text-[0.9375rem] leading-relaxed text-white/55">{copy.sub}</p>
        </div>
      </div>

      <div className="container-page relative grid h-full content-center gap-10 pt-[var(--header-height)] lg:grid-cols-12 lg:items-center">
        <SceneText service={service} index={index} className="lg:col-span-5" />
        <div data-phone className="mx-auto w-[min(19rem,64vw,34svh)] lg:col-span-4 lg:col-start-8 lg:w-[min(19rem,72vw)]" aria-hidden="true">
          <div className="rounded-[2.4rem] bg-[#0c0d0f] p-2 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.95)] ring-1 ring-white/15">
            <div className="relative flex aspect-[9/16] flex-col overflow-hidden rounded-[1.9rem] bg-[#101114] p-3.5 max-lg:aspect-[9/12]">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <span className="grid size-7 place-items-center rounded-lg" style={{ background: BLUE }}>
                  <ShoppingBag className="size-3.5 text-white" />
                </span>
                <span className="text-[0.8125rem] font-semibold">{copy.store}</span>
                <span className="ml-auto flex items-center gap-1 text-[0.625rem] text-white/45">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> online
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {copy.orders.map((o) => (
                  <li key={o.time} data-order className="rounded-xl bg-white/[0.06] p-2.5 ring-1 ring-white/10">
                    <p className="flex items-center justify-between text-[0.625rem] text-white/40">
                      <span className="flex items-center gap-1">
                        <Bell className="size-3" /> {copy.store}
                      </span>
                      {o.time}
                    </p>
                    <p className="mt-1 flex items-center justify-between gap-2 text-[0.75rem]">
                      <span className="flex items-center gap-1.5">
                        <Check className="size-3" style={{ color: BLUE }} />
                        {o.text}
                      </span>
                      <span className="font-semibold tabular-nums">{o.value}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <SampleNote className="mt-4 text-center">{copy.sample}</SampleNote>
        </div>
      </div>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */
/* Aplicativos: o app chega na tela do celular, notifica e abre.                */
/* -------------------------------------------------------------------------- */

function AppScene({ service, index }: SceneProps) {
  const copy = scenes.aplicativos;
  const ref = useScene((tl, q) => {
    tl.fromTo(q("[data-text]"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.12, ease: "power3.out" }, 0.05)
      .fromTo(q("[data-phone]"), { opacity: 0, y: 80, rotate: -4 }, { opacity: 1, y: 0, rotate: 0, duration: 0.16, ease: "power3.out" }, 0)
      .fromTo(q("[data-icon]"), { opacity: 0, scale: 0.3 }, { opacity: 1, stagger: 0.008, scale: 1, duration: 0.1, ease: "power2.out" }, 0.1)
      // O app do cliente cai no lugar dele, com um pulo.
      .fromTo(q("[data-app]"), { opacity: 0, scale: 2.6, y: -120 }, { opacity: 1, scale: 1, y: 0, duration: 0.14, ease: "bounce.out" }, 0.28)
      .fromTo(q("[data-push]"), { opacity: 0, yPercent: -140 }, { opacity: 1, yPercent: 0, duration: 0.1, ease: "back.out(1.4)" }, 0.46)
      .to(q("[data-push]"), { opacity: 0, yPercent: -140, duration: 0.08 }, 0.64)
      // Toque no app: a tela dele se abre a partir do ícone.
      .fromTo(q("[data-open]"), { clipPath: "inset(47% 38% 38% 38% round 18px)", opacity: 0 }, { clipPath: "inset(0% 0% 0% 0% round 0px)", opacity: 1, duration: 0.16 }, 0.68)
      .fromTo(q("[data-open] [data-fade]"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.02, duration: 0.08 }, 0.8)
      .to({}, { duration: 0.1 });
  });
  const s = copy.screen;

  return (
    <Stage stageRef={ref} height={300}>
      <div aria-hidden="true" className="absolute top-1/2 right-[18%] size-[42vw] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(44_157_245/0.12),transparent_65%)] blur-2xl" />
      <div className="container-page relative grid h-full content-center gap-10 pt-[var(--header-height)] lg:grid-cols-12 lg:items-center">
        <SceneText service={service} index={index} className="lg:col-span-5" />
        <div data-phone className="mx-auto w-[min(18rem,56vw,26svh)] lg:col-span-4 lg:col-start-8 lg:w-[min(18rem,66vw)]" aria-hidden="true">
          <div className="rounded-[2.4rem] bg-[#0c0d0f] p-2 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.95)] ring-1 ring-white/15">
            <div className="relative aspect-[9/19] overflow-hidden rounded-[1.9rem] bg-[linear-gradient(160deg,#16263a,#0d0f14_60%)] max-lg:aspect-[9/14]">
              <div className="grid grid-cols-4 gap-x-3 gap-y-4 p-4 pt-12">
                {Array.from({ length: 19 }, (_, i) => (
                  <span key={i} data-icon className="aspect-square rounded-[22%] bg-white/[0.09]" />
                ))}
                <span data-app className="relative grid aspect-square place-items-center rounded-[22%] shadow-[0_10px_24px_-6px_rgb(44_157_245/0.7)]" style={{ background: `linear-gradient(145deg,#5cb8ff,${BLUE} 55%,#1a6fc0)` }}>
                  <span className="text-[0.95rem] font-bold tracking-[-0.04em] text-white">R</span>
                </span>
              </div>
              <div data-push className="absolute inset-x-2.5 top-2.5 rounded-2xl bg-white/15 p-2.5 ring-1 ring-white/15 backdrop-blur-xl">
                <p className="flex items-center gap-1.5 text-[0.625rem] text-white/60">
                  <span className="grid size-4 place-items-center rounded-[5px] text-[0.5rem] font-bold text-white" style={{ background: BLUE }}>
                    R
                  </span>
                  {copy.push.title}
                  <span className="ml-auto">{copy.push.when}</span>
                </p>
                <p className="mt-1 text-[0.75rem] leading-snug">{copy.push.body}</p>
              </div>
              <div data-open className="absolute inset-0 flex flex-col bg-[#f4f6f9] p-4 pt-10 text-ink">
                <p data-fade className="text-[0.75rem] text-black/50">
                  {s.greeting}
                </p>
                <div data-fade className="mt-3 rounded-2xl p-4 text-white" style={{ background: BLUE }}>
                  <p className="text-[0.6875rem] text-white/75">{s.next}</p>
                  <p className="mt-1 text-[1.125rem] font-semibold tracking-[-0.02em]">{s.slot}</p>
                  <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-[0.6875rem] font-medium">{s.action}</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {s.items.map((item) => (
                    <li key={item} data-fade className="flex items-center justify-between rounded-xl bg-white px-3 py-3 text-[0.75rem] shadow-sm">
                      {item}
                      <ArrowRight className="size-3 text-black/30" />
                    </li>
                  ))}
                </ul>
                <div data-fade className="mt-auto flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[0.6875rem] text-black/40 shadow-sm">
                  <Search className="size-3" /> Buscar
                </div>
              </div>
            </div>
          </div>
          <SampleNote className="mt-4 text-center">{copy.sample}</SampleNote>
        </div>
      </div>
    </Stage>
  );
}
