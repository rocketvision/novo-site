"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath } from "@/components/cms/shell/nav";
import { cn } from "@/lib/utils";

export type TabItem = { href: string; label: string; badge?: number; exact?: boolean; exclude?: string[] };

/**
 * Abas do Studio, num estilo só: sublinhado, rolando na horizontal no celular.
 * Para subseções de uma página (ex.: Comissões → Recebimentos) e para as frentes de um registro
 * (ex.: Resumo, Cadastro, Equipe de um parceiro). A navegação entre áreas fica no menu lateral.
 */
export function Tabs({ items, label, className }: { items: TabItem[]; label: string; className?: string }) {
  const pathname = usePathname();
  // A aba mais específica que casa com o endereço ganha (ex.: /comissoes/regras não ativa /comissoes).
  const active = items.filter((t) => isActivePath(pathname, t)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label={label} className={cn("mb-6 border-b border-zinc-200", className)}>
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {items.map((t) => {
          const on = t.href === active;
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                  on ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900",
                )}
              >
                {t.label}
                {t.badge ? <span className="rounded-full bg-sky-100 px-1.5 text-[11px] font-semibold text-sky-800 tabular-nums">{t.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
