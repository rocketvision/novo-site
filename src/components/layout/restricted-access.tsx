"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowUpRight, ChevronDown, LockKeyhole } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { AllianceMark } from "@/components/alliance/alliance-logo";
import { restrictedAreas } from "@/lib/site";
import { ease, duration } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Area = (typeof restrictedAreas)[number];

/** Selo de cada painel: o símbolo da Rocket para clientes, a marca do Alliance para parceiros. */
function AreaIcon({ area }: { area: Area }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl text-white ring-1 ring-inset ring-white/10",
        area.key === "partner" ? "bg-[radial-gradient(120%_120%_at_30%_20%,#123352,#070b10)]" : "bg-[radial-gradient(120%_120%_at_30%_20%,#3a1204,#0a0a0b)]",
      )}
    >
      {area.key === "partner" ? <AllianceMark accent className="h-4.5" /> : <LogoMark className="size-5" />}
    </span>
  );
}

/** Uma linha do menu: selo, nome do painel, para quem é e a seta de saída. */
function AreaLink({ area, dark = false, onNavigate }: { area: Area; dark?: boolean; onNavigate?: () => void }) {
  return (
    <a
      href={area.href}
      onClick={onNavigate}
      className={cn(
        "group/area flex items-center gap-3 rounded-xl p-2.5 transition-colors duration-300",
        dark ? "hover:bg-white/[0.06] focus-visible:bg-white/[0.06]" : "hover:bg-black/[0.035] focus-visible:bg-black/[0.035]",
      )}
    >
      <AreaIcon area={area} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-medium tracking-[-0.01em]", dark ? "text-white" : "text-ink")}>{area.label}</span>
        <span className={cn("block text-xs", dark ? "text-white/50" : "text-muted")}>{area.caption}</span>
      </span>
      <ArrowUpRight
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 transition-transform duration-300 ease-out group-hover/area:translate-x-0.5 group-hover/area:-translate-y-0.5",
          dark ? "text-white/40" : "text-subtle",
        )}
      />
    </a>
  );
}

/**
 * Botão "Área restrita" do header (a partir de md): um cadeado discreto que abre um menu com os
 * dois painéis. Fecha com Esc (devolvendo o foco ao botão), com clique fora e ao escolher um painel.
 */
export function RestrictedMenu({ dark }: { dark: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm tracking-[-0.01em] ring-1 ring-inset transition-[color,box-shadow,background-color] duration-500",
          dark
            ? "text-white/75 ring-white/15 hover:text-white hover:ring-white/30"
            : "text-graphite/80 ring-black/10 hover:text-ink hover:ring-black/25",
          open && (dark ? "bg-white/[0.06] text-white" : "bg-black/[0.03] text-ink"),
        )}
      >
        <LockKeyhole aria-hidden="true" className="size-3.5" />
        Área restrita
        <ChevronDown aria-hidden="true" className={cn("size-3.5 opacity-60 transition-transform duration-300", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            id={menuId}
            className={cn(
              "absolute top-[calc(100%+0.625rem)] right-0 w-72 origin-top-right rounded-2xl p-2",
              dark
                ? "bg-ink-soft/95 ring-1 ring-white/10 backdrop-blur-xl"
                : "bg-white/95 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.35)] ring-1 ring-black/[0.07] backdrop-blur-xl",
            )}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: duration.fast, ease: ease.out }}
          >
            <p className={cn("px-2.5 pt-1.5 pb-2 font-mono text-[0.65rem] tracking-[0.14em] uppercase", dark ? "text-white/40" : "text-subtle")}>
              Acesso exclusivo
            </p>
            <ul>
              {restrictedAreas.map((area) => (
                <li key={area.key}>
                  <AreaLink area={area} dark={dark} onNavigate={() => setOpen(false)} />
                </li>
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Os dois painéis no menu do celular. */
export function RestrictedList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="pt-4">
      <p className="mb-2 flex items-center gap-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-subtle uppercase">
        <LockKeyhole aria-hidden="true" className="size-3" />
        Área restrita
      </p>
      <ul className="-mx-2.5">
        {restrictedAreas.map((area) => (
          <li key={area.key}>
            <AreaLink area={area} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}
