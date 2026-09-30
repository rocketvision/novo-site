import { DIAGNOSTIC_STATUSES } from "@/lib/diagnostic";
import { cn } from "@/lib/utils";

/** Cores de cada etapa do atendimento. */
export const STATUS_TONES: Record<string, string> = {
  sky: "bg-sky-50 text-sky-700 ring-sky-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  neutral: "bg-zinc-100 text-zinc-600 ring-zinc-500/15",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = DIAGNOSTIC_STATUSES.find((x) => x.key === status) ?? DIAGNOSTIC_STATUSES[0];
  return <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset", STATUS_TONES[s.tone], className)}>{s.label}</span>;
}
