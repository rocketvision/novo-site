import { STATUS_TONES } from "@/components/cms/diagnostics/status-badge";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = { ...STATUS_TONES, blue: STATUS_TONES.sky, red: "bg-red-50 text-red-700 ring-red-600/15" };

/** Selo de status das listas do Rocket Alliance (as cores seguem as do funil de diagnósticos). */
export function ToneBadge({ list, value, className }: { list: readonly { key: string; label: string; tone: string }[]; value: string; className?: string }) {
  const item = list.find((x) => x.key === value);
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONES[item?.tone ?? "neutral"], className)}>
      {item?.label ?? value}
    </span>
  );
}
