import { cn } from "@/lib/utils";

/**
 * Marca do Rocket Alliance: dois anéis entrelaçados (o anel aberto da Rocket Vision, agora em dupla)
 * e o foguete atravessando a interseção. Duas visões que se encontram e seguem juntas: "Grow Together.
 * Go Beyond." Vetorial, em currentColor; `accent` pinta o segundo anel com o azul da Rocket.
 *
 * O entrelaçado é feito com máscaras: cada anel passa por cima do outro em um dos cruzamentos.
 */
export function AllianceMark({ className, accent = false, title }: { className?: string; accent?: boolean; title?: string }) {
  return (
    <svg viewBox="0 0 44 32" fill="none" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} className={cn("h-7 w-auto shrink-0 overflow-visible", className)}>
      <defs>
        {/* Corte do anel esquerdo no cruzamento de baixo (ali o direito passa por cima). */}
        <mask id="ra-mask-left" maskUnits="userSpaceOnUse" x="-4" y="-4" width="52" height="40">
          <rect x="-4" y="-4" width="52" height="40" fill="#fff" />
          <circle cx="22" cy="25.75" r="2.3" fill="#000" />
        </mask>
        {/* Corte do anel direito no cruzamento de cima (ali o esquerdo passa por cima). */}
        <mask id="ra-mask-right" maskUnits="userSpaceOnUse" x="-4" y="-4" width="52" height="40">
          <rect x="-4" y="-4" width="52" height="40" fill="#fff" />
          <circle cx="22" cy="6.25" r="2.3" fill="#000" />
        </mask>
      </defs>
      <circle cx="15" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" mask="url(#ra-mask-left)" />
      <circle cx="29" cy="16" r="12" stroke={accent ? "#2c9df5" : "currentColor"} strokeWidth="1.5" mask="url(#ra-mask-right)" />
      {/* Foguete da marca Rocket Vision, na lente entre os anéis. */}
      <g transform="translate(14.6 8.6) scale(0.46)" fill="currentColor">
        <g transform="rotate(45 16 16)">
          <path fillRule="evenodd" d="M16 6c3 2.5 3.5 6 3 14h-6c-.5-8 0-11.5 3-14Zm1.6 6.5a1.6 1.6 0 1 0-3.2 0 1.6 1.6 0 1 0 3.2 0Z" />
          <path d="M13 15.5 10.5 18.5V21l2.5-1ZM19 15.5l2.5 3V21l-2.5-1Z" />
          <path d="M15.2 21.6h1.6v5.2h-1.6Z" opacity=".55" />
        </g>
      </g>
    </svg>
  );
}

/** Assinatura completa: marca + "Rocket Alliance" (+ linha opcional em versalete, ex.: "Alliance Hub"). */
export function AllianceLogo({ className, accent = true, caption, size = "md" }: { className?: string; accent?: boolean; caption?: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: { mark: "h-6", text: "text-[15px]", cap: "text-[8.5px] ml-[2.6rem]" }, md: { mark: "h-7", text: "text-[1.0625rem]", cap: "text-[9px] ml-[2.95rem]" }, lg: { mark: "h-10", text: "text-[1.6rem]", cap: "text-[11px] ml-[4.1rem]" } }[size];
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span className="inline-flex items-center gap-2.5">
        <AllianceMark accent={accent} className={s.mark} />
        <span className={cn("leading-none font-semibold tracking-[-0.02em] whitespace-nowrap", s.text)}>
          Rocket <span className="font-normal opacity-60">Alliance</span>
        </span>
      </span>
      {caption && <span className={cn("mt-1.5 leading-none font-light tracking-[0.42em] whitespace-nowrap uppercase opacity-55", s.cap)}>{caption}</span>}
    </span>
  );
}
