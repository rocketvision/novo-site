import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Exibe apenas o símbolo, sem o nome. */
  markOnly?: boolean;
};

/**
 * Símbolo vetorial redesenhado a partir do logo original em PNG do site anterior:
 * foguete em diagonal dentro de um anel aberto. Usa currentColor para se adaptar ao fundo.
 *
 * `animated`: a cada 8 s a chama acende, o foguete dá um impulso na diagonal e o anel gira meia
 * volta em órbita (os dois arcos são simétricos, então a volta encaixa sem emenda). Com o mouse
 * sobre o link, o foguete avança um pouco. Animação em CSS (globals.css, "Logo"); parada com
 * movimento reduzido.
 */
export function LogoMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("size-7 overflow-visible", animated && "logo-animated", className)}>
      <path
        className="logo-ring"
        d="M29.16 11.21A14 14 0 0 1 11.21 29.16M2.84 20.79A14 14 0 0 1 20.79 2.84"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <g className="logo-rocket-hover">
        <g className="logo-rocket">
          <g transform="rotate(45 16 16)" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16 6c3 2.5 3.5 6 3 14h-6c-.5-8 0-11.5 3-14Zm1.6 6.5a1.6 1.6 0 1 0-3.2 0 1.6 1.6 0 1 0 3.2 0Z"
            />
            <path d="M13 15.5 10.5 18.5V21l2.5-1ZM19 15.5l2.5 3V21l-2.5-1Z" />
            <path className="logo-flame" d="M15.2 21.6h1.6v5.2h-1.6Z" opacity=".55" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark animated />
      {!markOnly && (
        <span className="text-[1.0625rem] font-semibold tracking-[-0.02em]">
          Rocket <span className="logo-vision font-normal opacity-60">Vision</span>
        </span>
      )}
    </span>
  );
}
