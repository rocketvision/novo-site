import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/** Marca do Alliance Hub: o símbolo da Rocket Vision, "Rocket Alliance" e o nome do portal em versalete. */
export function HubLogo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex flex-col", dark ? "text-white" : "text-zinc-950", className)}>
      <span className="inline-flex items-center gap-2.5">
        <LogoMark className="size-6" />
        <span className="text-[15px] leading-none font-semibold tracking-[-0.02em]">
          Rocket <span className="font-normal opacity-60">Alliance</span>
        </span>
      </span>
      <span className={cn("mt-1 ml-[2.125rem] text-[8.5px] leading-none font-light tracking-[0.42em] uppercase", dark ? "text-white/50" : "text-zinc-500")}>Alliance Hub</span>
    </span>
  );
}
