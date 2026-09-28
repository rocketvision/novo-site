"use client";

/**
 * Adaptado de "Text Reveal" (Magic UI, publicado no 21st.dev por dillionverma).
 * Mudanças: tipografia e cores do design system, frase final com ênfase,
 * altura menor no mobile e versão estática para prefers-reduced-motion.
 */

import { useRef } from "react";
import { m, useTransform, type MotionValue } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { cn } from "@/lib/utils";

type TextRevealProps = {
  text: string;
  /** Rótulo exibido acima do texto, dentro da área fixa. */
  label?: React.ReactNode;
  /** Quantidade de palavras finais que recebem ênfase (cor cheia). */
  emphasizeLast?: number;
  className?: string;
};

export function TextReveal({ text, label, emphasizeLast = 0, className }: TextRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const scrollYProgress = useScrollProgress(ref, ["start start", "end end"]);

  const words = text.split(" ");
  const emphasisFrom = words.length - emphasizeLast;

  if (reduceMotion) {
    return (
      <div ref={ref} className={cn("container-page py-32", className)}>
        {label}
        <p className="text-headline mt-8 max-w-5xl text-white">{text}</p>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative h-[200vh] md:h-[230vh]", className)}>
      <div className="sticky top-0 flex h-svh items-center">
        <div className="container-page">
          {label && <div className="mb-8 md:mb-10">{label}</div>}
          {/* Texto completo para leitores de tela; as palavras animadas são decorativas. */}
          <p className="sr-only">{text}</p>
          <p aria-hidden="true" className="text-headline flex max-w-5xl flex-wrap">
            {words.map((word, i) => {
              // Termina um pouco antes do fim para a frase ficar legível parada.
              const start = (i / words.length) * 0.85;
              const end = start + 0.85 / words.length;
              return (
                <Word key={i} progress={scrollYProgress} range={[start, end]} emphasized={i >= emphasisFrom}>
                  {word}
                </Word>
              );
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

function Word({
  children,
  progress,
  range,
  emphasized,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  emphasized: boolean;
}) {
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <span className="relative mr-[0.25em]">
      <span className="absolute text-white/15">{children}</span>
      <m.span style={{ opacity }} className={emphasized ? "text-white" : "text-white/75"}>
        {children}
      </m.span>
    </span>
  );
}
