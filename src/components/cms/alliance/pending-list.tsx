import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import { relativeTime } from "@/lib/cms/format";
import { cn } from "@/lib/utils";
import type { PendingGroup } from "@/server/alliance/workspace";

/**
 * Caixa de pendências: o que precisa de alguém da equipe, agrupado por tipo, com link direto para
 * resolver cada item. Vazia, mostra que está tudo em dia (e não some, para não parecer erro).
 */
export function PendingList({ groups, empty = "Nada esperando a equipe agora. Tudo em dia." }: { groups: PendingGroup[]; empty?: string }) {
  if (groups.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-5 py-4 text-[13px] text-zinc-600">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-500" aria-hidden="true" />
        {empty}
      </div>
    );
  }
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {groups.map((g) => (
        <section key={g.key} className="flex flex-col rounded-lg border border-zinc-200 bg-white" aria-labelledby={`pend-${g.key}`}>
          <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
            <div className="min-w-0">
              <h3 id={`pend-${g.key}`} className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                {g.title}
                <span className="rounded-full bg-sky-100 px-1.5 text-[11px] font-semibold text-sky-800 tabular-nums">{g.count}</span>
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">{g.hint}</p>
            </div>
          </header>
          <ul className="flex-1 divide-y divide-zinc-100">
            {g.items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50">
                  <span className={cn("size-1.5 shrink-0 rounded-full", item.urgent ? "bg-amber-500" : "bg-sky-500")} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-zinc-900">{item.label}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      {item.detail}
                      {item.at && !item.urgent ? ` · ${relativeTime(item.at)}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-zinc-300 group-hover:text-zinc-500" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          {g.count > g.items.length && (
            <Link href={g.href} className="flex items-center justify-end gap-1 border-t border-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900">
              Ver todos ({g.count}) <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </section>
      ))}
    </div>
  );
}
