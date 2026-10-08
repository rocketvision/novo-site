"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AllianceTab = { href: string; label: string; badge?: number; group?: string; /** Caminhos que, mesmo começando com href, pertencem a outra aba. */ exclude?: string[] };

/**
 * Abas da área Rocket Alliance no Studio, agrupadas por tipo de trabalho (Operação, Conteúdo,
 * Administração). Cada aba só chega aqui se a pessoa tem a permissão dela.
 */
export function AllianceNav({ tabs }: { tabs: AllianceTab[] }) {
  const pathname = usePathname();
  const active = (t: AllianceTab) => {
    if (t.href === "/cms/alliance") return pathname === t.href;
    if (t.exclude?.some((x) => pathname === x || pathname.startsWith(`${x}/`))) return false;
    return pathname === t.href || pathname.startsWith(`${t.href}/`);
  };
  const groups = tabs.reduce<{ name: string; tabs: AllianceTab[] }[]>((acc, t) => {
    const name = t.group ?? "";
    const last = acc[acc.length - 1];
    if (last && last.name === name) last.tabs.push(t);
    else acc.push({ name, tabs: [t] });
    return acc;
  }, []);
  return (
    // Os grupos quebram linha em vez de rolar: nada fica escondido e não aparece barra de rolagem.
    <nav aria-label="Rocket Alliance" className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-zinc-200">
      {groups.map((g) => (
        <div key={g.name || "main"} className="min-w-0">
          {g.name && <p className="px-3 text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase">{g.name}</p>}
          <ul className="-mb-px flex flex-wrap gap-x-1">
            {g.tabs.map((t) => (
              <li key={t.href} className="shrink-0">
                <Link
                  href={t.href}
                  aria-current={active(t) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium whitespace-nowrap",
                    active(t) ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900",
                  )}
                >
                  {t.label}
                  {t.badge ? (
                    <span className="rounded-full bg-sky-100 px-1.5 text-[11px] font-semibold text-sky-800 tabular-nums" aria-label={`${t.badge} pendentes`}>
                      {t.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Subseções de uma aba (ex.: Comissões → Lançamentos, Recebimentos, Pagamentos, Regras). */
export function AllianceSubNav({ tabs, label }: { tabs: AllianceTab[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="mb-6 flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1 sm:inline-flex">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={pathname === t.href ? "page" : undefined}
          className={cn("rounded-md px-3 py-1.5 text-[13px] font-medium", pathname === t.href ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900")}
        >
          {t.label}
          {t.badge ? <span className="ml-1.5 text-[11px] font-semibold text-sky-700 tabular-nums">{t.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
