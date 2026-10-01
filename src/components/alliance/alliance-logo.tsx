import { cn } from "@/lib/utils";

/**
 * Marca do Rocket Alliance: dois anéis abertos (o anel da Rocket Vision, em dupla) entrelaçados e o
 * foguete da marca atravessando a interseção. Duas visões que se encontram e seguem juntas.
 * Vetorial, em currentColor; `accent` pinta o segundo anel com o azul da Rocket.
 *
 * - Entrelaçado: cada anel passa por cima do outro em um dos cruzamentos (máscaras fixas).
 * - O foguete tem um recorte em volta (máscara com a silhueta engrossada), então aparece inteiro
 *   sobre os anéis em qualquer fundo.
 * - `animated`: o mesmo compasso da logo principal (globals.css, "Logo do Rocket Alliance"): a chama
 *   acende, o foguete dá um impulso e os anéis giram meia volta em sentidos opostos. Parado com
 *   movimento reduzido.
 */

const ROCKET_BODY = "M16 6c3 2.5 3.5 6 3 14h-6c-.5-8 0-11.5 3-14Zm1.6 6.5a1.6 1.6 0 1 0-3.2 0 1.6 1.6 0 1 0 3.2 0Z";
const ROCKET_FINS = "M13 15.5 10.5 18.5V21l2.5-1ZM19 15.5l2.5 3V21l-2.5-1Z";
const ROCKET_FLAME = "M15.2 21.6h1.6v5.2h-1.6Z";
/** Foguete no centro (22, 16), em escala 0,7, na diagonal da marca. */
const ROCKET_TRANSFORM = "translate(10.8 4.8) scale(0.7) rotate(45 16 16)";

export function AllianceMark({ className, accent = false, animated = false, title }: { className?: string; accent?: boolean; animated?: boolean; title?: string }) {
  return (
    <svg
      viewBox="0 0 44 32"
      fill="none"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("h-7 w-auto shrink-0 overflow-visible", animated && "alliance-animated", className)}
    >
      <defs>
        {/* Recorte em volta do foguete: a silhueta, engrossada, apaga os anéis por baixo dele. */}
        <mask id="ra-mask-rocket" maskUnits="userSpaceOnUse" x="-6" y="-6" width="56" height="44">
          <rect x="-6" y="-6" width="56" height="44" fill="#fff" />
          <g transform={ROCKET_TRANSFORM} fill="#000" stroke="#000" strokeWidth="3.4" strokeLinejoin="round">
            <path d={ROCKET_BODY} />
            <path d={ROCKET_FINS} />
          </g>
        </mask>
        {/* Entrelaçado: o esquerdo some no cruzamento de baixo, o direito no de cima. */}
        <mask id="ra-mask-left" maskUnits="userSpaceOnUse" x="-6" y="-6" width="56" height="44">
          <rect x="-6" y="-6" width="56" height="44" fill="#fff" />
          <circle cx="22" cy="25.75" r="2.3" fill="#000" />
        </mask>
        <mask id="ra-mask-right" maskUnits="userSpaceOnUse" x="-6" y="-6" width="56" height="44">
          <rect x="-6" y="-6" width="56" height="44" fill="#fff" />
          <circle cx="22" cy="6.25" r="2.3" fill="#000" />
        </mask>
      </defs>

      <g mask="url(#ra-mask-rocket)">
        {/* Anéis abertos, como o da marca: as aberturas ficam para fora. */}
        <g mask="url(#ra-mask-left)">
          <g transform="rotate(150 15 16)">
            <circle className="alliance-ring-left" cx="15" cy="16" r="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" pathLength={100} strokeDasharray="86 14" />
          </g>
        </g>
        <g mask="url(#ra-mask-right)">
          <g transform="rotate(-30 29 16)">
            <circle className="alliance-ring-right" cx="29" cy="16" r="12" stroke={accent ? "#2c9df5" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" pathLength={100} strokeDasharray="86 14" />
          </g>
        </g>
      </g>

      <g className="alliance-rocket-hover">
        <g className="alliance-rocket">
          <g transform={ROCKET_TRANSFORM} fill="currentColor">
            <path fillRule="evenodd" d={ROCKET_BODY} />
            <path d={ROCKET_FINS} />
            <path className="alliance-flame" d={ROCKET_FLAME} opacity=".55" />
          </g>
        </g>
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
