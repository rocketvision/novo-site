import { cn } from "@/lib/utils";

/**
 * Marca do Rocket Alliance: o símbolo da Rocket Vision, intacto, envolvido por uma órbita fina e
 * inclinada, com um ponto (o parceiro) girando em volta. "One ecosystem. Infinite possibilities."
 * A metade de trás da órbita é mais apagada, o que dá profundidade sem cortes no desenho.
 *
 * `animated`: o símbolo segue o ciclo da logo principal (mesmas classes de globals.css) e o ponto
 * percorre a órbita devagar. Parado com movimento reduzido.
 */
/** A órbita como caminho: começa à direita e sobe (passa por trás), depois volta pela frente. */
const ORBIT_PATH = "M47 16 A23 5.2 0 1 0 1 16 A23 5.2 0 1 0 47 16";

export function AllianceMark({ className, accent = false, animated = false, title }: { className?: string; accent?: boolean; animated?: boolean; title?: string }) {
  const orbit = accent ? "#2c9df5" : "currentColor";
  return (
    <svg
      viewBox="0 0 48 32"
      fill="none"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("h-7 w-auto shrink-0 overflow-visible", animated && "alliance-animated", className)}
    >
      <defs>
        <linearGradient id="ra-orbit-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={orbit} stopOpacity="0.25" />
          <stop offset="0.5" stopColor={orbit} stopOpacity="0.25" />
          <stop offset="0.5" stopColor={orbit} stopOpacity="1" />
          <stop offset="1" stopColor={orbit} stopOpacity="1" />
        </linearGradient>
        {/* A órbita passa por trás do foguete: um recorte fino em volta da silhueta dele. */}
        <mask id="ra-orbit-behind" maskUnits="userSpaceOnUse" x="-4" y="-4" width="56" height="40">
          <rect x="-4" y="-4" width="56" height="40" fill="#fff" />
          <g transform="translate(8 0) rotate(45 16 16)" fill="#000" stroke="#000" strokeWidth="2.6" strokeLinejoin="round">
            <path d="M16 6c3 2.5 3.5 6 3 14h-6c-.5-8 0-11.5 3-14Z" />
            <path d="M13 15.5 10.5 18.5V21l2.5-1ZM19 15.5l2.5 3V21l-2.5-1Z" />
            <path d="M15.2 21.6h1.6v5.2h-1.6Z" />
          </g>
        </mask>
      </defs>

      {/* Órbita inclinada: atrás mais apagada, na frente inteira. */}
      <g mask="url(#ra-orbit-behind)">
        <g transform="rotate(-12 24 16)">
          <ellipse cx="24" cy="16" rx="23" ry="5.2" stroke="url(#ra-orbit-fade)" strokeWidth="0.9" />
        </g>
      </g>

      {/* Símbolo da Rocket Vision, o mesmo da logo principal. */}
      <svg x="8" y="0" width="32" height="32" viewBox="0 0 32 32" className={cn("overflow-visible", animated && "logo-animated")}>
        <path className="logo-ring" d="M29.16 11.21A14 14 0 0 1 11.21 29.16M2.84 20.79A14 14 0 0 1 20.79 2.84" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <g className="logo-rocket">
          <g transform="rotate(45 16 16)" fill="currentColor">
            <path fillRule="evenodd" d="M16 6c3 2.5 3.5 6 3 14h-6c-.5-8 0-11.5 3-14Zm1.6 6.5a1.6 1.6 0 1 0-3.2 0 1.6 1.6 0 1 0 3.2 0Z" />
            <path d="M13 15.5 10.5 18.5V21l2.5-1ZM19 15.5l2.5 3V21l-2.5-1Z" />
            <path className="logo-flame" d="M15.2 21.6h1.6v5.2h-1.6Z" opacity=".55" />
          </g>
        </g>
      </svg>

      {/* O parceiro: um ponto na órbita. Animado, percorre a elipse e fica mais apagado quando passa por trás. */}
      <g transform="rotate(-12 24 16)">
        {animated ? (
          <>
            <circle className="alliance-dot-moving" r="1.7" fill={orbit}>
              <animateMotion dur="12s" repeatCount="indefinite" path={ORBIT_PATH} />
              <animate attributeName="opacity" dur="12s" repeatCount="indefinite" values="1;0.3;0.3;1;1" keyTimes="0;0.08;0.42;0.5;1" />
            </circle>
            <circle className="alliance-dot-still" cx="38.8" cy="20" r="1.7" fill={orbit} />
          </>
        ) : (
          <circle cx="38.8" cy="20" r="1.7" fill={orbit} />
        )}
      </g>
    </svg>
  );
}

/** Assinatura completa: marca + "Rocket Alliance" (+ linha opcional em versalete, ex.: "Alliance Hub"). */
export function AllianceLogo({ className, accent = true, animated = true, caption, size = "md" }: { className?: string; accent?: boolean; animated?: boolean; caption?: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: { mark: "h-6", text: "text-[15px]", cap: "text-[8.5px] ml-[2.6rem]" }, md: { mark: "h-7", text: "text-[1.0625rem]", cap: "text-[9px] ml-[2.95rem]" }, lg: { mark: "h-10", text: "text-[1.6rem]", cap: "text-[11px] ml-[4.1rem]" } }[size];
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span className="inline-flex items-center gap-2.5">
        <AllianceMark accent={accent} animated={animated} className={s.mark} />
        <span className={cn("leading-none font-semibold tracking-[-0.02em] whitespace-nowrap", s.text)}>
          Rocket <span className="font-normal opacity-60">Alliance</span>
        </span>
      </span>
      {caption && <span className={cn("mt-1.5 leading-none font-light tracking-[0.42em] whitespace-nowrap uppercase opacity-55", s.cap)}>{caption}</span>}
    </span>
  );
}
