import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Exibe apenas o símbolo, sem o nome. */
  markOnly?: boolean;
};

/**
 * Símbolo vetorial redesenhado a partir do logo original em PNG do site anterior:
 * foguete em diagonal dentro de um anel aberto. Usa currentColor para se adaptar ao fundo.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("size-7", className)}>
      <path
        d="M29.16 11.21A14 14 0 0 1 11.21 29.16M2.84 20.79A14 14 0 0 1 20.79 2.84"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <g transform="rotate(45 16 16)" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16 6c3 2.5 3.5 6 3 14h-6c-.5-8 0-11.5 3-14Zm1.6 6.5a1.6 1.6 0 1 0-3.2 0 1.6 1.6 0 1 0 3.2 0Z"
        />
        <path d="M13 15.5 10.5 18.5V21l2.5-1ZM19 15.5l2.5 3V21l-2.5-1Z" />
        <path d="M15.2 21.6h1.6v5.2h-1.6Z" opacity=".55" />
      </g>
    </svg>
  );
}

export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!markOnly && (
        <span className="text-[1.0625rem] font-semibold tracking-[-0.02em]">
          Rocket <span className="font-normal opacity-60">Vision</span>
        </span>
      )}
    </span>
  );
}
