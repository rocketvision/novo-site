"use client";

import { useEffect, useState } from "react";
import { rail } from "@/content/landing-scenes";
import { cn } from "@/lib/utils";

/**
 * Trilho lateral: as seções entre a abertura e o formulário como marcos de uma rota.
 * Aparece só enquanto uma delas está na tela e marca a atual. Telas largas apenas.
 */
export function SideRail() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      let current: string | null = null;
      for (const { id } of rail) {
        const rect = document.getElementById(id)?.getBoundingClientRect();
        if (rect && rect.top <= mid && rect.bottom >= mid) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav
      aria-label="Seções da página"
      className={cn(
        "fixed top-1/2 left-3 z-40 hidden -translate-y-1/2 transition-opacity duration-500 xl:block",
        active ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ol className="flex flex-col items-center gap-7">
        {rail.map(({ id, label }, i) => {
          const on = id === active;
          return (
            <li key={id}>
              <a href={`#${id}`} aria-current={on ? "true" : undefined} className="group flex flex-col items-center gap-2">
                <span className={cn("font-mono text-[0.625rem] tabular-nums transition-colors duration-300", on ? "text-white" : "text-white/30 group-hover:text-white/60")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "font-mono text-[0.5625rem] tracking-[0.18em] uppercase transition-colors duration-300 [writing-mode:vertical-rl] rotate-180",
                    on ? "text-white/80" : "text-white/25 group-hover:text-white/50",
                  )}
                >
                  {label}
                </span>
                <span className={cn("w-px transition-[height,background-color] duration-500", on ? "h-6 bg-[#2c9df5]" : "h-2 bg-white/20")} aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
