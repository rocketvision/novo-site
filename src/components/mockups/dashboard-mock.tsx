import { BarChart3, Boxes, CalendarDays, LayoutGrid, Settings2, Users } from "lucide-react";
import { Bar } from "./browser-frame";

const nav = [LayoutGrid, BarChart3, Boxes, Users, CalendarDays, Settings2];

const done = { status: "Concluído", tone: "bg-emerald-500" };
const picking = { status: "Em separação", tone: "bg-accent" };
const waiting = { status: "Aguardando", tone: "bg-black/25" };
const rows = [done, picking, waiting, done, picking, done, waiting, done];

const sparklines = [
  [40, 55, 48, 70, 62, 84, 78],
  [30, 42, 50, 46, 64, 70, 88],
  [60, 52, 66, 58, 72, 68, 80],
  [70, 64, 58, 62, 48, 44, 36],
];

/**
 * Ilustração de um painel de gestão. Não representa dados reais:
 * usa barras e formas neutras em vez de números.
 */
export function DashboardMock() {
  return (
    <div aria-hidden="true" className="flex h-full bg-[#fafafa] text-[0.6875rem] text-graphite">
      <aside className="hidden w-14 shrink-0 flex-col items-center gap-4 border-r border-black/[0.05] bg-white py-5 sm:flex">
        <span className="mb-2 size-6 rounded-lg bg-ink" />
        {nav.map((Icon, i) => (
          <Icon key={i} className={i === 0 ? "size-4 text-ink" : "size-4 text-black/30"} strokeWidth={1.75} />
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[0.8125rem] font-semibold tracking-tight">Visão geral da operação</p>
            <Bar className="w-28" />
          </div>
          <div className="flex gap-2">
            <span className="hidden h-7 w-20 rounded-full bg-black/[0.04] sm:block" />
            <span className="h-7 w-24 rounded-full bg-ink" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {["Pedidos", "Faturamento", "Clientes", "Tarefas"].map((label, i) => (
            <div key={label} className="rounded-xl bg-white p-3 ring-1 ring-black/[0.04]">
              <p className="text-black/45">{label}</p>
              <span className="mt-3 block h-3.5 w-3/5 rounded bg-black/[0.12]" />
              <div className="mt-3 flex h-6 items-end gap-0.5">
                {sparklines[i].map((h, j) => (
                  <span
                    key={j}
                    style={{ height: `${h}%` }}
                    className={j === 6 ? "flex-1 rounded-sm bg-accent" : "flex-1 rounded-sm bg-black/[0.08]"}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-5">
          <div className="rounded-xl bg-white p-4 ring-1 ring-black/[0.04] md:col-span-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">Desempenho</p>
              <Bar className="w-14" />
            </div>
            <svg viewBox="0 0 300 110" className="mt-3 h-[calc(100%-1.5rem)] min-h-24 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="dash-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#ff5b1f" stopOpacity=".18" />
                  <stop offset="1" stopColor="#ff5b1f" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[20, 50, 80].map((y) => (
                <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="rgb(0 0 0 / .05)" />
              ))}
              <path d="M0 92 C40 86 60 70 95 72 S150 50 185 46 245 28 300 14 L300 110 L0 110Z" fill="url(#dash-area)" />
              <path d="M0 92 C40 86 60 70 95 72 S150 50 185 46 245 28 300 14" fill="none" stroke="#ff5b1f" strokeWidth="2" />
              <path d="M0 98 C50 95 80 88 120 86 S200 76 300 62" fill="none" stroke="rgb(0 0 0 / .18)" strokeWidth="1.5" strokeDasharray="4 4" />
            </svg>
          </div>
          <div className="hidden rounded-xl bg-white p-4 ring-1 ring-black/[0.04] md:col-span-2 md:block">
            <p className="font-medium">Pedidos recentes</p>
            <ul className="mt-4 space-y-3">
              {rows.map((row, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="size-6 shrink-0 rounded-full bg-black/[0.06]" />
                  <Bar className="flex-1" />
                  <span className="flex items-center gap-1.5 text-[0.625rem] text-black/50">
                    <span className={`size-1.5 rounded-full ${row.tone}`} />
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
