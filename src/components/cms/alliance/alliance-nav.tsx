"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AllianceTab = { href: string; label: string; badge?: number };

/** Abas da área Rocket Alliance no Studio. Cada aba só chega aqui se a pessoa tem a permissão dela. */
export function AllianceNav({ tabs }: { tabs: AllianceTab[] }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/cms/alliance" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Rocket Alliance" className="-mx-4 mb-6 overflow-x-auto border-b border-zinc-200 px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {tabs.map((t) => (
          <li key={t.href} className="shrink-0">
            <Link
              href={t.href}
              aria-current={active(t.href) ? "page" : undefined}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium whitespace-nowrap",
                active(t.href) ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900",
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
