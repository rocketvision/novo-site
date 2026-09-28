"use client";

import { useId } from "react";
import { m, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Ilustrações para ideias abstratas (compromissos e método), na linguagem das páginas da Apple:
 * um glifo sólido e grande, com degradê, sobre uma placa de vidro fosco e manchas de cor desfocadas.
 * Glifos desenhados para a Rocket, na paleta do Design System (destaque laranja, grafite e névoa).
 */

export type GlyphName = "talk" | "scope" | "craft" | "shield" | "grow" | "coffee" | "plan" | "layers" | "launch";

/** Degradês compartilhados por um glifo: destaque (laranja) e tinta (grafite). */
function Gradients({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffa37a" />
        <stop offset="0.5" stopColor="#ff5b1f" />
        <stop offset="1" stopColor="#c2410c" />
      </linearGradient>
      <linearGradient id={`${id}-i`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#48484e" />
        <stop offset="1" stopColor="#0a0a0b" />
      </linearGradient>
    </defs>
  );
}

export function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  const id = useId().replace(/:/g, "");
  const a = `url(#${id}-a)`;
  const ink = `url(#${id}-i)`;
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={cn("drop-shadow-[0_0.6em_0.8em_rgb(0_0_0/0.18)]", className)}>
      <Gradients id={id} />
      {name === "talk" && (
        <>
          <rect x="12" y="18" width="62" height="46" rx="17" fill={ink} />
          <path d="M28 60 L22 78 L44 62 Z" fill={ink} />
          <rect x="46" y="46" width="62" height="46" rx="17" fill={a} />
          <path d="M92 88 L98 106 L76 90 Z" fill={a} />
          {[62, 77, 92].map((cx) => (
            <circle key={cx} cx={cx} cy="69" r="5" fill="white" />
          ))}
        </>
      )}
      {name === "scope" && (
        <>
          <rect x="24" y="14" width="72" height="96" rx="16" fill={a} />
          <rect x="44" y="6" width="32" height="16" rx="8" fill={ink} />
          {[42, 64, 86].map((y) => (
            <g key={y}>
              <circle cx="42" cy={y} r="8.5" fill="white" />
              <path d={`M37.5 ${y} l3.2 3.4 l6 -6.6`} stroke="#ff5b1f" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="57" y={y - 4.5} width="27" height="9" rx="4.5" fill="white" opacity="0.85" />
            </g>
          ))}
        </>
      )}
      {name === "craft" && (
        <>
          <path d="M42 32 L16 60 L42 88" stroke={ink} strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M78 32 L104 60 L78 88" stroke={ink} strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M70 20 L50 100" stroke={a} strokeWidth="14" strokeLinecap="round" />
        </>
      )}
      {name === "shield" && (
        <>
          <path d="M60 8 L100 22 V56 C100 84 82 102 60 112 C38 102 20 84 20 56 V22 Z" fill={a} />
          <path d="M66 28 L42 64 H58 L53 94 L79 54 H62 Z" fill="white" />
        </>
      )}
      {name === "grow" && (
        <>
          <rect x="14" y="72" width="26" height="36" rx="9" fill={ink} opacity="0.55" />
          <rect x="47" y="48" width="26" height="60" rx="9" fill={ink} />
          <rect x="80" y="16" width="26" height="92" rx="9" fill={a} />
        </>
      )}
      {name === "coffee" && (
        <>
          <rect x="46" y="8" width="60" height="40" rx="15" fill={a} />
          <path d="M60 46 L54 60 L74 46 Z" fill={a} />
          {[62, 76, 90].map((cx) => (
            <circle key={cx} cx={cx} cy="28" r="4.6" fill="white" />
          ))}
          <path d="M16 62 H84 V76 C84 96 70 110 50 110 C30 110 16 96 16 76 Z" fill={ink} />
          <path d="M84 70 C102 70 102 94 84 94" stroke={ink} strokeWidth="8" fill="none" strokeLinecap="round" />
        </>
      )}
      {name === "plan" && (
        <>
          <rect x="12" y="22" width="96" height="86" rx="18" fill={ink} />
          <path d="M12 40 A18 18 0 0 1 30 22 H90 A18 18 0 0 1 108 40 V46 H12 Z" fill={a} />
          <rect x="34" y="10" width="9" height="22" rx="4.5" fill={ink} />
          <rect x="77" y="10" width="9" height="22" rx="4.5" fill={ink} />
          {[36, 60].flatMap((cy) => [36, 60, 84].map((cx) => ({ cx, cy: cy + 30 }))).map(({ cx, cy }, i) =>
            i === 5 ? (
              <g key={i}>
                <circle cx={cx} cy={cy} r="9" fill={a} />
                <path d={`M${cx - 4.2} ${cy} l3 3.2 l5.6 -6.2`} stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ) : (
              <circle key={i} cx={cx} cy={cy} r="5" fill="white" opacity="0.35" />
            ),
          )}
        </>
      )}
      {name === "layers" && (
        <>
          <path d="M60 64 L106 86 L60 108 L14 86 Z" fill={ink} opacity="0.45" />
          <path d="M60 42 L106 64 L60 86 L14 64 Z" fill={ink} />
          <path d="M60 12 L106 34 L60 56 L14 34 Z" fill={a} />
        </>
      )}
      {name === "launch" && (
        // O foguete da marca Rocket (mesmo desenho de LogoMark), ampliado.
        <g transform="translate(0 0) scale(3.75)">
          <path d="M29.16 11.21A14 14 0 0 1 11.21 29.16M2.84 20.79A14 14 0 0 1 20.79 2.84" stroke={ink} strokeWidth="2" strokeLinecap="round" fill="none" />
          <g transform="rotate(45 16 16)" fill={a}>
            <path fillRule="evenodd" d="M16 6c3 2.5 3.5 6 3 14h-6c-.5-8 0-11.5 3-14Zm1.6 6.5a1.6 1.6 0 1 0-3.2 0 1.6 1.6 0 1 0 3.2 0Z" />
            <path d="M13 15.5 10.5 18.5V21l2.5-1ZM19 15.5l2.5 3V21l-2.5-1Z" />
            <path d="M15.2 21.6h1.6v5.2h-1.6Z" opacity=".55" />
          </g>
        </g>
      )}
    </svg>
  );
}

/**
 * Glifo sobre vidro fosco. As manchas de cor atrás dão ao vidro o que desfocar.
 * `t` (0 a 1), quando existe, faz a placa assentar: sobe, endireita e cresce.
 */
export function GlassIllustration({ name, t, className }: { name: GlyphName; t?: MotionValue<number>; className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <span className="absolute size-[15em] -translate-x-[4.5em] -translate-y-[2.5em] rounded-full bg-accent/40 blur-[3em]" />
      <span className="absolute size-[12em] translate-x-[5em] translate-y-[3em] rounded-full bg-[#ffc2a3]/60 blur-[3em]" />
      <span className="absolute size-[8em] translate-x-[6em] -translate-y-[5em] rounded-full bg-ink/15 blur-[2.5em]" />
      {t ? <SettlingTile name={name} t={t} /> : <Tile name={name} />}
    </div>
  );
}

function SettlingTile({ name, t }: { name: GlyphName; t: MotionValue<number> }) {
  const scale = useTransform(t, [0, 0.7], [0.82, 1]);
  const rotate = useTransform(t, [0, 0.7], [-8, 0]);
  const y = useTransform(t, [0, 0.7], ["2em", "0em"]);
  const opacity = useTransform(t, [0, 0.35], [0.4, 1]);
  return (
    <m.div style={{ scale, rotate, y, opacity }}>
      <Tile name={name} />
    </m.div>
  );
}

function Tile({ name }: { name: GlyphName }) {
  return (
    <div className="relative size-[14em] overflow-hidden rounded-[3.6em] bg-white/55 shadow-[0_2.4em_4em_-1.6em_rgb(0_0_0/0.35),inset_0_0.08em_0_rgb(255_255_255/0.95)] ring-1 ring-white/70 backdrop-blur-2xl">
      {/* Reflexo do vidro. */}
      <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent" />
      <Glyph name={name} className="absolute inset-[2em]" />
    </div>
  );
}
