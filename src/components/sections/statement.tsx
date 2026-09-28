"use client";

import { useRef } from "react";
import { m, useMotionValueEvent, useTransform } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { statement } from "@/content/landing";
import { LogoMark } from "@/components/ui/logo";

/**
 * Virada da narrativa: o fundo passa do escuro (problema) para o claro (solução)
 * enquanto a proposta da Rocket ganha foco. A seção fica fixa durante a transição.
 */
export function Statement() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const scrollYProgress = useScrollProgress(ref, ["start start", "end end"]);

  const background = useTransform(scrollYProgress, [0, 0.35], ["#0a0a0b", "#fbfbfd"]);
  const color = useTransform(scrollYProgress, [0.05, 0.35], ["#ffffff", "#1d1d1f"]);
  const bodyColor = useTransform(scrollYProgress, [0.05, 0.35], ["rgba(255,255,255,0.6)", "rgba(29,29,31,0.72)"]);
  const scale = useTransform(scrollYProgress, [0, 0.45], [0.9, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0.2, 1]);
  const bodyOpacity = useTransform(scrollYProgress, [0.35, 0.55], [0, 1]);
  const bodyY = useTransform(scrollYProgress, [0.35, 0.55], [24, 0]);

  // Informa ao header se ele está sobre a parte escura ou clara da transição.
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    ref.current?.setAttribute("data-header", value < 0.2 ? "dark" : "light");
  });

  if (reduceMotion) {
    return (
      <section ref={ref} aria-labelledby="statement-titulo" className="bg-paper py-32 md:py-44">
        <StatementContent />
      </section>
    );
  }

  return (
    <m.section ref={ref} aria-labelledby="statement-titulo" style={{ backgroundColor: background }} data-header="dark" className="relative h-[180vh]">
      <div className="sticky top-0 flex h-svh items-center">
        <m.div style={{ color }} className="w-full">
          <StatementContent
            titleStyle={{ scale, opacity }}
            bodyStyle={{ opacity: bodyOpacity, y: bodyY, color: bodyColor }}
          />
        </m.div>
      </div>
    </m.section>
  );
}

type MotionStyle = React.ComponentProps<typeof m.div>["style"];

function StatementContent({ titleStyle, bodyStyle }: { titleStyle?: MotionStyle; bodyStyle?: MotionStyle }) {
  return (
    <div className="container-page flex flex-col items-center text-center">
      <LogoMark className="size-10 text-accent" />
      <m.h2 id="statement-titulo" style={titleStyle} className="text-headline mt-8 max-w-5xl text-balance">
        {statement.title}
      </m.h2>
      <m.p style={bodyStyle} className="text-lead mt-8 max-w-2xl text-muted">
        {statement.body}
      </m.p>
    </div>
  );
}
