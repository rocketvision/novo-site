import { cn } from "@/lib/utils";

/**
 * Selo de cada nível do Rocket Alliance: medalhão com a marca da Rocket Vision no centro, aro
 * metálico próprio do nível e, na versão completa, "ROCKET ALLIANCE" e o nível gravados no aro.
 *
 * - Member: platina sobre fundo claro.
 * - Pro: azul Rocket sobre fundo escuro.
 * - Elite: ouro sobre obsidiana.
 *
 * Vetorial e sem imagens: nítido em qualquer tamanho, do chip do Hub ao card do site.
 * `detailed` liga o texto no aro (use a partir de ~72px; abaixo disso fica ilegível).
 */

type Tier = "member" | "pro" | "elite";

const FINISH: Record<Tier, { rim: [string, string, string]; disc: [string, string]; mark: string; engrave: string; glow: string; stars: number; label: string }> = {
  member: { rim: ["#fbfcfd", "#a9b2bc", "#eef1f4"], disc: ["#ffffff", "#e9edf1"], mark: "#1d2024", engrave: "#5b636c", glow: "rgb(169 178 188 / 0.35)", stars: 1, label: "MEMBER" },
  pro: { rim: ["#b9e0ff", "#2c9df5", "#0a5596"], disc: ["#13202e", "#06090d"], mark: "#e9f5ff", engrave: "#8ecbff", glow: "rgb(44 157 245 / 0.45)", stars: 2, label: "PRO" },
  elite: { rim: ["#f8e7b0", "#c9a24a", "#6d4f17"], disc: ["#17140e", "#050505"], mark: "#f6e3a8", engrave: "#d9b968", glow: "rgb(201 162 74 / 0.45)", stars: 3, label: "ELITE" },
};

export function TierBadge({ tier, size = 48, detailed = false, className, title }: { tier: string; size?: number; detailed?: boolean; className?: string; title?: string }) {
  const key: Tier = tier === "elite" || tier === "pro" ? tier : "member";
  const f = FINISH[key];
  const id = `ra-badge-${key}`;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0 overflow-visible", className)}
    >
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={f.rim[0]} />
          <stop offset="0.45" stopColor={f.rim[1]} />
          <stop offset="0.7" stopColor={f.rim[0]} />
          <stop offset="1" stopColor={f.rim[2]} />
        </linearGradient>
        <radialGradient id={`${id}-disc`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor={f.disc[0]} />
          <stop offset="1" stopColor={f.disc[1]} />
        </radialGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <path id={`${id}-top`} d="M 21 60 A 39 39 0 0 1 99 60" />
        <path id={`${id}-bottom`} d="M 16 60 A 44 44 0 0 0 104 60" />
      </defs>

      {/* Halo suave. */}
      <circle cx="60" cy="60" r="58" fill={f.glow} opacity="0.35" />
      {/* Aro metálico. */}
      <circle cx="60" cy="60" r="56" fill={`url(#${id}-rim)`} />
      <circle cx="60" cy="60" r="55.25" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.5" />
      {/* Disco. */}
      <circle cx="60" cy="60" r={detailed ? 47 : 49} fill={`url(#${id}-disc)`} />
      <circle cx="60" cy="60" r={detailed ? 47 : 49} fill="none" stroke={f.rim[1]} strokeOpacity="0.6" strokeWidth="0.75" />
      {detailed && <circle cx="60" cy="60" r="33" fill="none" stroke={f.engrave} strokeOpacity="0.35" strokeWidth="0.5" />}

      {detailed && (
        <g fill={f.engrave} fontSize="7.2" fontWeight="600" letterSpacing="2.6" style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
          <text textAnchor="middle">
            <textPath href={`#${id}-top`} startOffset="50%">
              ROCKET ALLIANCE
            </textPath>
          </text>
          <text textAnchor="middle">
            <textPath href={`#${id}-bottom`} startOffset="50%">
              {f.label}
            </textPath>
          </text>
        </g>
      )}

      {/* Marca da Rocket Vision (mesmo desenho do LogoMark). */}
      <g transform={detailed ? "translate(43 39) scale(1.06)" : "translate(37 35) scale(1.44)"} color={f.mark}>
        <path d="M29.16 11.21A14 14 0 0 1 11.21 29.16M2.84 20.79A14 14 0 0 1 20.79 2.84" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <g transform="rotate(45 16 16)" fill="currentColor">
          <path fillRule="evenodd" d="M16 6c3 2.5 3.5 6 3 14h-6c-.5-8 0-11.5 3-14Zm1.6 6.5a1.6 1.6 0 1 0-3.2 0 1.6 1.6 0 1 0 3.2 0Z" />
          <path d="M13 15.5 10.5 18.5V21l2.5-1ZM19 15.5l2.5 3V21l-2.5-1Z" />
          <path d="M15.2 21.6h1.6v5.2h-1.6Z" opacity=".55" />
        </g>
      </g>

      {/* Uma, duas ou três estrelas: o nível em qualquer tamanho. */}
      <g fill={f.engrave}>
        {Array.from({ length: f.stars }, (_, i) => {
          const x = 60 + (i - (f.stars - 1) / 2) * 7;
          const y = detailed ? 82 : 92;
          return <path key={i} d={`M ${x} ${y - 2.6} L ${x + 2.6} ${y} L ${x} ${y + 2.6} L ${x - 2.6} ${y} Z`} />;
        })}
      </g>

      {/* Brilho do vidro sobre o disco. */}
      <ellipse cx="60" cy="40" rx="40" ry="24" fill={`url(#${id}-sheen)`} />
    </svg>
  );
}
