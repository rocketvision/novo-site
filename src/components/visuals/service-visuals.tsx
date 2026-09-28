"use client";

import { m, useTransform, type MotionValue } from "motion/react";
import { CalendarCheck, FileText, LayoutGrid, Moon, ShoppingBag, Store } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { site } from "@/lib/site";
import type { Resolved } from "@/lib/content/resolved";
import { cn } from "@/lib/utils";
import { Bar, CheckDot, FileCard, SearchBox, Stage, StickyNote, Tag, shadow, softShadow } from "./primitives";
import { symptomOf } from "./transformations";

type Problem = Resolved<"problem">;
type Service = Resolved<"services">["items"][number];

/**
 * Serviços: cada um mostra o improviso que resolve chegando ao resultado.
 * O selo de resultado da seção (ex.: "Pedido confirmado") aparece por cima, como clímax.
 * `t` vai de 0 a 1 enquanto o serviço está em cena.
 */
type Props = { t: MotionValue<number>; problem: Problem };

/** Ambiente de cada serviço: claro e escuro se alternam, sempre dentro da paleta. */
export function serviceTone(id: string): "light" | "dark" {
  return id === "sistemas" || id === "identidade" ? "dark" : "light";
}

export function ServiceVisual({ service, size = [2.3, 3.2], ...props }: Props & { service: Service; size?: [number, number] }) {
  const dark = serviceTone(service.id) === "dark";
  return (
    <div
      className={cn(
        "absolute inset-0",
        dark
          ? "bg-ink-soft bg-[radial-gradient(80%_70%_at_70%_20%,rgb(255_91_31/0.18),transparent_65%)]"
          : "bg-mist bg-[radial-gradient(80%_70%_at_75%_15%,rgb(255_91_31/0.08),transparent_60%)]",
      )}
    >
      <Stage size={size}>
        <Scene id={service.id} {...props} />
      </Stage>
    </div>
  );
}

function Scene({ id, ...props }: Props & { id: string }) {
  switch (id) {
    case "sites":
      return <SiteScene {...props} />;
    case "lojas":
      return <StoreScene {...props} />;
    case "sistemas":
      return <SystemScene {...props} />;
    case "aplicativos":
      return <AppScene {...props} />;
    case "identidade":
      return <BrandScene />;
    default:
      return null;
  }
}

const useFadeIn = (t: MotionValue<number>, from: number, to: number) => ({
  opacity: useTransform(t, [from, to], [0, 1]),
  y: useTransform(t, [from, to], ["1em", "0em"]),
});

/* Sites: a empresa sai da página 6 e vira o primeiro resultado. */
function SiteScene({ t, problem }: Props) {
  const query = symptomOf(problem, "search")?.artifact ?? "sua empresa";
  const climb = useTransform(t, [0.15, 0.7], ["11em", "0em"]);
  const others = useTransform(t, [0.15, 0.7], ["-3.4em", "0em"]);
  const pages = [1, 2, 3, 4, 5, 6];
  // O marcador da página atual vai da 6 para a 1.
  const marker = useTransform(t, [0.15, 0.7], ["12.5em", "0em"]);

  return (
    <div className={cn("w-[28em] rounded-[1.4em] bg-white p-[1.4em]", shadow)}>
      <SearchBox query={query} className="py-[0.7em]" />
      <div className="relative mt-[1.2em] h-[14.4em]">
        <m.ul style={{ y: others }} className="absolute inset-x-0 top-[3.4em] space-y-[1em]">
          {["w-4/5", "w-3/5", "w-2/3"].map((w, i) => (
            <li key={i} className="space-y-[0.45em] px-[0.8em]">
              <Bar className="w-1/3 bg-black/[0.12]" />
              <Bar className={w} />
            </li>
          ))}
        </m.ul>
        <m.div style={{ y: climb }} className="absolute inset-x-0 top-0 rounded-[0.9em] bg-white px-[0.8em] py-[0.6em] ring-[0.14em] ring-accent">
          <p className="text-[0.9em] font-semibold text-ink">{query}</p>
          <Bar className="mt-[0.45em] w-4/5" />
        </m.div>
      </div>
      <div className="relative mt-[0.6em] flex gap-[0.5em] border-t border-line pt-[1em]">
        <m.span style={{ x: marker }} className="absolute top-[1em] left-0 size-[2em] rounded-full bg-ink" />
        {pages.map((n) => (
          <span key={n} className="relative flex size-[2em] items-center justify-center text-muted mix-blend-difference">
            <span className="text-[0.8em]">{n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* Lojas: o balcão fechou, a venda acontece mesmo assim. */
function StoreScene({ t, problem }: Props) {
  const time = symptomOf(problem, "file")?.meta.match(/\d{1,2}:\d{2}/)?.[0] ?? "23:48";
  const sign = { opacity: useTransform(t, [0.2, 0.55], [1, 0.35]), rotate: useTransform(t, [0, 0.5], [-7, -3]) };
  const order = useFadeIn(t, 0.3, 0.6);
  const paid = useTransform(t, [0.55, 0.75], [0, 1]);

  return (
    <div className="flex items-center gap-[2.4em]">
      <m.div style={sign} className="flex origin-top flex-col items-center">
        <span className="h-[3.5em] w-px bg-ink/30" />
        <div className={cn("flex items-center gap-[0.7em] rounded-[0.8em] bg-white px-[1.3em] py-[0.9em]", softShadow)}>
          <Store className="size-[1.2em] text-muted" strokeWidth={1.75} />
          <span className="text-[1.2em] font-semibold tracking-tight text-ink">Fechado</span>
        </div>
      </m.div>
      <m.div style={order} className={cn("w-[17em] rounded-[1.3em] bg-white p-[1.3em]", shadow)}>
        <div className="flex items-center justify-between">
          <span className="flex size-[2.3em] items-center justify-center rounded-[0.6em] bg-ink text-white">
            <ShoppingBag className="size-[1.15em]" strokeWidth={1.75} />
          </span>
          <span className="flex items-center gap-[0.4em] text-muted">
            <Moon className="size-[0.9em]" strokeWidth={1.75} />
            <span className="font-mono text-[0.8em] tabular-nums">{time}</span>
          </span>
        </div>
        <div className="mt-[1.1em] space-y-[0.5em]">
          <Bar className="w-3/4" />
          <Bar className="w-1/2" />
        </div>
        <m.div style={{ opacity: paid }} className="mt-[1.1em] flex items-center gap-[0.6em] border-t border-line pt-[0.9em]">
          <CheckDot />
          <Bar className="w-2/5" />
        </m.div>
      </m.div>
    </div>
  );
}

/** Planilha espalhada que entra no sistema. */
function useInbound(t: MotionValue<number>, x: number, y: number, rotate: number) {
  return {
    x: useTransform(t, [0, 0.45], [`${x}em`, "0em"]),
    y: useTransform(t, [0, 0.45], [`${y}em`, "0em"]),
    rotate: useTransform(t, [0, 0.45], [rotate, 0]),
    scale: useTransform(t, [0, 0.45], [0.8, 0.4]),
    opacity: useTransform(t, [0.3, 0.45], [1, 0]),
  };
}

/* Sistemas: as planilhas entram em um lugar só e o relatório sai pronto. */
function SystemScene({ t, problem }: Props) {
  const file = symptomOf(problem, "file");
  const name = file?.artifact ?? "planilha.xlsx";
  const files = [useInbound(t, -12, -7, -8), useInbound(t, 11, -8, 7), useInbound(t, -13, 6, 5), useInbound(t, 12, 7, -6)];
  const hub = { scale: useTransform(t, [0.3, 0.5], [0.85, 1]), opacity: useTransform(t, [0.25, 0.45], [0, 1]) };
  const report = { y: useTransform(t, [0.5, 0.8], ["0em", "7.5em"]), opacity: useTransform(t, [0.5, 0.6], [0, 1]) };

  return (
    <div className="relative flex h-[26em] w-[36em] items-center justify-center">
      {files.map((style, i) => (
        <m.div key={i} style={style} className="absolute">
          <FileCard name={name} meta={file?.meta} />
        </m.div>
      ))}
      <m.div style={report} className={cn("absolute w-[13em] rounded-[1em] bg-white p-[1em]", shadow)}>
        <div className="flex items-center gap-[0.6em]">
          <FileText className="size-[1.2em] text-accent" strokeWidth={1.75} />
          <Bar className="w-1/2 bg-black/[0.12]" />
        </div>
        <div className="mt-[0.8em] space-y-[0.45em]">
          <Bar className="w-full" />
          <Bar className="w-4/5" />
          <Bar className="w-3/5" />
        </div>
      </m.div>
      <m.div style={hub} className={cn("relative w-[17em] rounded-[1.3em] bg-white p-[1.2em]", shadow)}>
        <div className="flex items-center gap-[0.7em]">
          <span className="flex size-[2.3em] items-center justify-center rounded-[0.6em] bg-ink text-white">
            <LayoutGrid className="size-[1.15em]" strokeWidth={1.75} />
          </span>
          <Bar className="w-2/5 bg-black/[0.12]" />
        </div>
        <ul className="mt-[1em] space-y-[0.5em] border-t border-line pt-[0.9em]">
          {["w-3/4", "w-1/2", "w-2/3"].map((w, i) => (
            <li key={i} className="flex items-center gap-[0.6em]">
              <span className="size-[0.5em] rounded-full bg-emerald-500" />
              <Bar className={w} />
            </li>
          ))}
        </ul>
      </m.div>
    </div>
  );
}

/* Aplicativos: a ideia do post-it chega ao celular do cliente. */
function AppScene({ t, problem }: Props) {
  const note = symptomOf(problem, "note")?.artifact ?? "";
  const chatTime = "09:14";
  const paper = { opacity: useTransform(t, [0.15, 0.45], [1, 0]), x: useTransform(t, [0.15, 0.45], ["0em", "-3em"]), rotate: -6 };
  const phone = useFadeIn(t, 0.25, 0.55);
  const notice = { opacity: useTransform(t, [0.55, 0.7], [0, 1]), y: useTransform(t, [0.55, 0.75], ["-1.5em", "0em"]) };

  return (
    <div className="relative flex items-center justify-center">
      <m.div style={paper} className="absolute -left-[15em]">
        <StickyNote text={note} />
      </m.div>
      <m.div style={phone} className={cn("relative h-[27em] w-[13.5em] rounded-[2.2em] bg-ink p-[0.45em]", shadow)}>
        <div className="relative h-full overflow-hidden rounded-[1.8em] bg-graphite bg-[radial-gradient(120%_70%_at_50%_0%,rgb(255_91_31/0.35),transparent_70%)] px-[0.8em] pt-[3.2em]">
          <span className="absolute top-[0.8em] left-1/2 h-[1.1em] w-[4em] -translate-x-1/2 rounded-full bg-black" />
          <p className="text-center font-mono text-[2.4em] leading-none font-medium tracking-tight text-white tabular-nums">{chatTime}</p>
          <m.div style={notice} className="mt-[2em] flex items-center gap-[0.7em] rounded-[1em] bg-white/90 p-[0.8em] backdrop-blur">
            <span className="flex size-[2.2em] shrink-0 items-center justify-center rounded-[0.6em] bg-accent text-white">
              <CalendarCheck className="size-[1.1em]" strokeWidth={2} />
            </span>
            <div className="flex-1 space-y-[0.4em]">
              <Bar className="w-3/5 bg-black/[0.14]" />
              <Bar className="w-4/5" />
            </div>
          </m.div>
        </div>
      </m.div>
    </div>
  );
}

/* Identidade visual: a identidade real da Rocket, idêntica em cada aplicação. */
function BrandScene() {
  return (
    <div className="grid w-[34em] grid-cols-[1.35fr_1fr] gap-[1.2em]">
      <div className={cn("flex aspect-[1.75] flex-col justify-between rounded-[0.9em] bg-paper p-[1.4em] text-ink", shadow)}>
        <LogoMark className="size-[2.4em] text-accent" />
        <div>
          <p className="text-[1.25em] font-semibold tracking-[-0.03em]">
            Rocket <span className="font-normal opacity-60">Vision</span>
          </p>
          <Bar className="mt-[0.6em] w-2/5" />
        </div>
      </div>
      <div className="grid grid-rows-2 gap-[1.2em]">
        <div className={cn("flex items-center justify-center rounded-[1.4em] bg-accent text-white", shadow)}>
          <LogoMark className="size-[3.2em]" />
        </div>
        <div className={cn("flex items-center justify-center rounded-[0.9em] bg-ink text-white ring-1 ring-white/10", shadow)}>
          <LogoMark className="size-[2.6em] text-accent" />
        </div>
      </div>
      <div className={cn("col-span-2 flex items-center gap-[0.8em] rounded-full bg-white px-[1em] py-[0.7em]", shadow)}>
        <LogoMark className="size-[1.4em] text-ink" />
        <span className="text-[0.85em] font-medium text-ink">Rocket Vision</span>
        <span className="ml-auto flex items-center gap-[0.4em]">
          <Tag>{new URL(site.url).host}</Tag>
        </span>
      </div>
    </div>
  );
}
