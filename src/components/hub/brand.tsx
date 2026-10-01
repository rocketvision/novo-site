import { AllianceLogo } from "@/components/alliance/alliance-logo";
import { cn } from "@/lib/utils";

/** Marca do Alliance Hub: a assinatura do Rocket Alliance com o nome do portal em versalete. */
export function HubLogo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return <AllianceLogo size="sm" caption="Alliance Hub" className={cn(dark ? "text-white" : "text-zinc-950", className)} />;
}
