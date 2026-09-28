import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const WORD = "Content Studio";

/**
 * Marca do Content Studio: o logo original da Rocket Vision (preto e branco, sem alterações)
 * com "Content Studio" em versalete espaçado logo abaixo. As letras entram uma a uma e,
 * depois, um brilho discreto atravessa a palavra de tempos em tempos (desligado com movimento reduzido).
 */
export function StudioLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex flex-col text-zinc-950", className)}>
      <span className="inline-flex items-center gap-2.5">
        <LogoMark className={compact ? "size-6" : "size-7"} />
        <span className={cn("leading-none font-semibold tracking-[-0.02em]", compact ? "text-[15px]" : "text-[1.0625rem]")}>
          Rocket <span className="font-normal opacity-60">Vision</span>
        </span>
      </span>
      <span
        role="img"
        aria-label={WORD}
        className={cn("studio-word relative mt-1 block leading-none font-light whitespace-nowrap uppercase", compact ? "ml-[2.125rem] text-[8.5px]" : "ml-[2.375rem] text-[9.5px]")}
      >
        <span aria-hidden="true" className="block text-zinc-500">
          {Array.from(WORD).map((letter, i) => (
            <span key={i} className="studio-letter" style={{ animationDelay: `${150 + i * 45}ms` }}>
              {letter === " " ? " " : letter}
            </span>
          ))}
        </span>
        <span aria-hidden="true" className="studio-shine">
          {WORD}
        </span>
      </span>
    </span>
  );
}
