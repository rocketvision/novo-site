"use client";

import type { MotionValue } from "motion/react";
import { GlassIllustration, type GlyphName } from "./illustrations";
import { Stage } from "./primitives";

/**
 * Como trabalhamos: uma ilustração por etapa.
 * Entendemos (o primeiro café, com conversa), Planejamos (o calendário com a etapa aprovada),
 * Construímos (design e código em camadas) e Evoluímos (o foguete da Rocket no ar).
 */
const GLYPHS: GlyphName[] = ["coffee", "plan", "layers", "launch"];

export function StepVisual({ index, t }: { index: number; t: MotionValue<number> }) {
  return (
    <div className="absolute inset-0 bg-paper">
      <Stage size={[2.4, 4.4]}>
        <GlassIllustration name={GLYPHS[index] ?? "scope"} t={t} />
      </Stage>
    </div>
  );
}
