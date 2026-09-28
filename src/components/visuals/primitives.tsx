import { Check, FileSpreadsheet, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Peças dos visuais da página.
 *
 * São os mesmos objetos do improviso que caem sobre o hero (planilha, conversa, busca, post-it),
 * redesenhados em `em` para escalar com o palco onde aparecem. Nenhum dado é inventado:
 * os textos vêm da copy e as linhas cinzas representam conteúdo sem fingir que ele existe.
 */

export const shadow = "shadow-[0_1.6em_3.2em_-1.2em_rgb(0_0_0/0.45)]";
export const softShadow = "shadow-[0_1.2em_2.6em_-1.4em_rgb(0_0_0/0.28)]";

/**
 * Palco que escala com o contêiner: todo o conteúdo é medido em `em` a partir deste tamanho de fonte,
 * que acompanha a menor proporção entre largura e altura disponíveis.
 */
export function Stage({
  children,
  className,
  size = [2.2, 3],
}: {
  children: React.ReactNode;
  className?: string;
  /** Tamanho da fonte base em cqw e cqh; vale o menor. */
  size?: [number, number];
}) {
  return (
    <div aria-hidden="true" className={cn("absolute inset-0 overflow-hidden [container-type:size]", className)}>
      <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: `min(${size[0]}cqw, ${size[1]}cqh)` }}>
        {children}
      </div>
    </div>
  );
}

/** Linha de conteúdo sem texto. */
export function Bar({ className }: { className?: string }) {
  return <span className={cn("block h-[0.5em] rounded-full bg-black/[0.08]", className)} />;
}

export function CheckDot({ className }: { className?: string }) {
  return (
    <span className={cn("flex size-[1.5em] shrink-0 items-center justify-center rounded-full bg-accent text-white", className)}>
      <Check className="size-[0.85em]" strokeWidth={3} />
    </span>
  );
}

export function FileCard({ name, meta, className }: { name: string; meta?: string; className?: string }) {
  return (
    <div className={cn("w-[17em] rounded-[1.1em] bg-white p-[1em]", shadow, className)}>
      <div className="flex items-center gap-[0.75em]">
        <span className="flex size-[2.4em] shrink-0 items-center justify-center rounded-[0.6em] bg-emerald-600 text-white">
          <FileSpreadsheet className="size-[1.3em]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-mono text-[0.75em] font-medium text-ink">{name}</p>
          {meta && <p className="mt-[0.2em] text-[0.68em] text-muted">{meta}</p>}
        </div>
      </div>
      <div className="mt-[0.8em] grid grid-cols-4 gap-px overflow-hidden rounded-[0.4em] bg-black/10">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className={cn("h-[0.8em] bg-white", i === 6 && "bg-red-100", i === 9 && "bg-amber-100")} />
        ))}
      </div>
    </div>
  );
}

export function ChatBubble({ text, meta, time = "09:14", className }: { text: string; meta?: string; time?: string; className?: string }) {
  return (
    <div className={cn("w-[17em] rounded-[1.1em] bg-[#1f2c34] p-[0.85em]", shadow, className)}>
      <div className="rounded-[0.8em] rounded-tl-[0.2em] bg-[#2a3942] px-[0.8em] py-[0.65em]">
        <p className="text-[0.85em] leading-snug text-white/90">{text}</p>
        <p className="mt-[0.3em] text-right text-[0.62em] text-white/45">{time}</p>
      </div>
      {meta && (
        <p className="mt-[0.7em] flex items-center gap-[0.5em] text-[0.7em] text-emerald-300">
          <span className="size-[0.45em] rounded-full bg-emerald-400" />
          {meta}
        </p>
      )}
    </div>
  );
}

export function SearchBox({ query, className }: { query: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-[0.6em] rounded-full bg-mist px-[0.9em] py-[0.55em]", className)}>
      <Search className="size-[0.9em] text-muted" />
      <span className="text-[0.85em] text-ink">{query}</span>
    </div>
  );
}

export function SearchCard({ query, meta, className }: { query: string; meta?: string; className?: string }) {
  return (
    <div className={cn("w-[17em] rounded-[1.1em] bg-white p-[1em]", shadow, className)}>
      <SearchBox query={query} />
      <div className="mt-[0.8em] space-y-[0.5em]">
        <Bar className="w-4/5" />
        <Bar className="w-3/5 bg-black/[0.06]" />
      </div>
      {meta && <p className="mt-[0.8em] text-[0.7em] text-muted">{meta}</p>}
    </div>
  );
}

export function StickyNote({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("w-[14em] bg-[#fde68a] px-[1.1em] pt-[1.3em] pb-[1.5em]", shadow, className)}>
      <p className="text-[0.95em] leading-snug font-medium text-[#3b2f0b] italic">{text}</p>
    </div>
  );
}

/** Rótulo pequeno em mono, como os do Design System. */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[0.62em] tracking-[0.14em] text-muted uppercase", className)}>{children}</span>;
}
