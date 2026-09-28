import { Check, CreditCard, Mail, Search, ShoppingBag, Zap } from "lucide-react";
import type { ServiceVisual } from "@/content/landing";
import { cn } from "@/lib/utils";
import { Bar, BrowserFrame } from "./browser-frame";

/**
 * Ilustrações de cada serviço. Todas são decorativas (aria-hidden) e
 * construídas em HTML/CSS: leves, nítidas em qualquer tela e sem layout shift.
 * Mostram o resultado para o cliente (um contato, uma venda, uma tarefa automatizada),
 * não a tecnologia.
 */

function Toast({ icon, title, className }: { icon: React.ReactNode; title: string; className?: string }) {
  return (
    <div
      className={cn(
        "absolute flex items-center gap-3 rounded-2xl bg-white/95 py-3 pr-5 pl-3 text-[0.75rem] shadow-[0_20px_50px_-20px_rgb(0_0_0/0.35)] ring-1 ring-black/[0.06] backdrop-blur",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-xl bg-ink text-white">{icon}</span>
      <div className="space-y-1.5">
        <p className="font-medium tracking-tight text-graphite">{title}</p>
        <Bar className="w-20" />
      </div>
    </div>
  );
}

function SiteVisual() {
  return (
    <div className="relative h-full w-full">
      <BrowserFrame className="h-full">
        <div className="flex h-full flex-col p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <span className="h-3 w-16 rounded-full bg-ink" />
            <div className="hidden gap-4 sm:flex">
              <Bar className="w-10" />
              <Bar className="w-10" />
              <Bar className="w-10" />
            </div>
            <span className="h-6 w-16 rounded-full bg-black/[0.08]" />
          </div>
          <div className="mt-8 max-w-[70%] space-y-2.5 sm:mt-12">
            <span className="block h-4 w-full rounded-full bg-graphite sm:h-5" />
            <span className="block h-4 w-4/5 rounded-full bg-graphite sm:h-5" />
            <Bar className="mt-4 w-3/5" />
            <Bar className="w-2/5" />
            <span className="mt-5 inline-block h-7 w-28 rounded-full bg-accent" />
          </div>
          <div className="mt-auto grid grid-cols-3 gap-3 pt-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-gradient-to-br from-black/[0.04] to-black/[0.09]" />
            ))}
          </div>
        </div>
      </BrowserFrame>
      <Toast icon={<Mail className="size-4" />} title="Novo contato pelo site" className="-right-2 bottom-10 sm:-right-6" />
      <div className="absolute top-16 -left-2 hidden items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[0.6875rem] text-graphite shadow-[0_12px_30px_-14px_rgb(0_0_0/0.3)] ring-1 ring-black/[0.06] sm:flex sm:-left-6">
        <Search className="size-3.5 text-muted" />
        <span>sua empresa aparece aqui</span>
      </div>
    </div>
  );
}

function StoreVisual() {
  return (
    <div className="relative h-full w-full">
      <BrowserFrame className="h-full" address="loja.suaempresa.com.br">
        <div className="flex h-full flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="h-3 w-14 rounded-full bg-ink" />
            <ShoppingBag className="size-4 text-graphite" strokeWidth={1.75} />
          </div>
          <div className="mt-5 grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={cn("flex flex-col gap-2", i > 3 && "hidden sm:flex")}>
                <div
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-xl",
                    i === 1 ? "bg-[#f3e9e2]" : "bg-black/[0.045]",
                  )}
                >
                  <span className={cn("size-8 rounded-full sm:size-10", i === 1 ? "bg-accent/70" : "bg-black/[0.09]")} />
                </div>
                <Bar className="w-3/4" />
                <span className="h-2 w-1/3 rounded-full bg-graphite/70" />
              </div>
            ))}
          </div>
        </div>
      </BrowserFrame>
      <div className="absolute -right-2 bottom-8 w-52 rounded-2xl bg-white p-4 text-[0.75rem] shadow-[0_24px_60px_-24px_rgb(0_0_0/0.4)] ring-1 ring-black/[0.06] sm:-right-6">
        <div className="flex items-center gap-2 text-muted">
          <CreditCard className="size-3.5" />
          <span>Pagamento</span>
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="size-4" strokeWidth={2.5} />
          </span>
          <p className="font-medium tracking-tight text-graphite">Pedido confirmado</p>
        </div>
      </div>
    </div>
  );
}

function SystemVisual() {
  const columns = [
    { label: "Recebido", cards: 3 },
    { label: "Em andamento", cards: 2 },
    { label: "Concluído", cards: 3 },
  ];
  return (
    <div className="relative h-full w-full">
      <BrowserFrame className="h-full" dark address="gestao.suaempresa.com.br">
        <div className="flex h-full flex-col p-5 text-[0.6875rem] text-white/70 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-[0.8125rem] font-semibold tracking-tight text-white">Fluxo de pedidos</p>
            <span className="h-6 w-20 rounded-full bg-white/10" />
          </div>
          <div className="mt-5 grid flex-1 grid-cols-3 gap-3">
            {columns.map((col, i) => (
              <div key={col.label} className="flex flex-col gap-2 rounded-xl bg-white/[0.03] p-2.5">
                <p className="flex items-center gap-1.5 text-white/50">
                  <span className={cn("size-1.5 rounded-full", i === 0 ? "bg-white/40" : i === 1 ? "bg-accent" : "bg-emerald-400")} />
                  <span className="truncate">{col.label}</span>
                </p>
                {Array.from({ length: col.cards }).map((_, j) => (
                  <div key={j} className="space-y-2 rounded-lg bg-white/[0.06] p-2.5 ring-1 ring-white/5">
                    <span className="block h-1.5 w-4/5 rounded-full bg-white/25" />
                    <span className="block h-1.5 w-1/2 rounded-full bg-white/10" />
                    <div className="flex items-center justify-between pt-1">
                      <span className="size-4 rounded-full bg-white/15" />
                      {i === 2 && <Check className="size-3 text-emerald-400" />}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </BrowserFrame>
      <Toast icon={<Zap className="size-4" />} title="Relatório gerado automaticamente" className="-bottom-4 left-4 sm:-left-6" />
    </div>
  );
}

function AppVisual() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="absolute h-[82%] w-[42%] max-w-56 translate-x-[38%] rotate-6 rounded-[2.2rem] bg-black/[0.06]" />
      <div className="relative aspect-[9/19] h-[92%] max-h-[34rem] rounded-[2.6rem] bg-ink p-2 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.45)]">
        <div className="flex h-full flex-col overflow-hidden rounded-[2.1rem] bg-[#fafafa] text-[0.625rem] text-graphite">
          <div className="flex justify-center pt-2">
            <span className="h-4 w-16 rounded-full bg-ink" />
          </div>
          <div className="flex flex-1 flex-col gap-3 px-4 pt-5">
            <div className="space-y-1.5">
              <Bar className="w-1/3" />
              <p className="text-[0.9375rem] font-semibold tracking-tight">Olá, bem-vinda</p>
            </div>
            <div className="rounded-2xl bg-ink p-3.5 text-white">
              <p className="text-white/60">Seu próximo agendamento</p>
              <span className="mt-2.5 block h-2.5 w-3/4 rounded-full bg-white/80" />
              <span className="mt-2 block h-2 w-1/2 rounded-full bg-white/30" />
              <span className="mt-3.5 inline-block h-6 w-20 rounded-full bg-accent" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-2 rounded-xl bg-white p-2.5 ring-1 ring-black/[0.05]">
                  <span className="block size-5 rounded-lg bg-black/[0.07]" />
                  <Bar className="w-3/4" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-black/[0.05]">
                  <span className="size-6 rounded-lg bg-black/[0.06]" />
                  <Bar className="flex-1" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-around border-t border-black/[0.05] bg-white py-3">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn("size-4 rounded-md", i === 0 ? "bg-ink" : "bg-black/10")} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandVisual() {
  const swatches = ["bg-ink", "bg-[#2b3a55]", "bg-[#e9e2d6]", "bg-accent"];
  return (
    <div className="grid h-full w-full grid-cols-5 grid-rows-5 gap-3">
      <div className="col-span-3 row-span-3 flex items-center justify-center rounded-2xl bg-ink">
        <svg viewBox="0 0 80 80" className="w-1/3 text-white" fill="none">
          <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="6" />
          <path d="M40 10v60M10 40h30" stroke="currentColor" strokeWidth="6" />
        </svg>
      </div>
      <div className="col-span-2 row-span-3 flex flex-col justify-between rounded-2xl bg-white p-4 ring-1 ring-black/[0.05]">
        <p className="text-5xl font-semibold tracking-[-0.05em] text-graphite sm:text-6xl">Aa</p>
        <div className="space-y-1.5">
          <Bar className="w-full" />
          <Bar className="w-2/3" />
        </div>
      </div>
      <div className="col-span-2 row-span-2 grid grid-cols-2 gap-2">
        {swatches.map((s) => (
          <span key={s} className={cn("rounded-xl", s)} />
        ))}
      </div>
      <div className="col-span-3 row-span-2 flex items-end justify-between rounded-2xl bg-[#e9e2d6] p-4">
        <div className="space-y-1.5">
          <span className="block h-2.5 w-24 rounded-full bg-ink/80" />
          <span className="block h-2 w-16 rounded-full bg-ink/30" />
        </div>
        <svg viewBox="0 0 80 80" className="size-8 text-ink" fill="none">
          <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="8" />
          <path d="M40 10v60M10 40h30" stroke="currentColor" strokeWidth="8" />
        </svg>
      </div>
    </div>
  );
}

const visuals: Record<ServiceVisual, () => React.JSX.Element> = {
  site: SiteVisual,
  store: StoreVisual,
  system: SystemVisual,
  app: AppVisual,
  brand: BrandVisual,
};

export function ServiceVisualArt({ type, className }: { type: ServiceVisual; className?: string }) {
  const Visual = visuals[type];
  return (
    <div aria-hidden="true" className={cn("h-full w-full", className)}>
      <Visual />
    </div>
  );
}
