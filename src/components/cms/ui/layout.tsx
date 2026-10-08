import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho de página: título objetivo, descrição curta opcional e ações à direita.
 * `leading` fica à esquerda do título (ex.: logo de um parceiro); `meta` é a linha de selos (situação, nível).
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  leading,
  meta,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: React.ReactNode;
  leading?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      {back && <div className="mb-3">{back}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {leading && <div className="shrink-0">{leading}</div>}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
            {meta && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</div>}
            {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Indicadores em cartões: número em destaque, rótulo acima e contexto abaixo. Com `href`, o cartão é um link. */
export function StatGrid({ items, className }: { items: { label: string; value: string; hint?: string; href?: string }[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", items.length >= 5 && "lg:grid-cols-5", items.length === 4 && "lg:grid-cols-4", className)}>
      {items.map((m) => {
        const body = (
          <>
            <span className="block truncate text-xs font-medium text-zinc-500">{m.label}</span>
            <span className="mt-1.5 block truncate text-xl font-semibold tracking-tight text-zinc-900 tabular-nums">{m.value}</span>
            {m.hint && <span className="mt-1 block text-xs leading-snug text-zinc-500">{m.hint}</span>}
          </>
        );
        const card = "rounded-lg border border-zinc-200 bg-white px-4 py-3.5";
        return m.href ? (
          <Link key={m.label} href={m.href} className={cn(card, "transition-colors hover:border-zinc-300 hover:bg-zinc-50/60")}>
            {body}
          </Link>
        ) : (
          <div key={m.label} className={card}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** Bloco de conteúdo com título. */
export function Panel({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border border-zinc-200 bg-white", className)}>
      {(title || actions) && (
        <div className="flex min-h-[3.25rem] items-center justify-between gap-4 border-b border-zinc-100 px-5 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ title, action, icon }: { title: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
      {icon && <div className="text-zinc-400">{icon}</div>}
      <p className="text-sm text-zinc-600">{title}</p>
      {action}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-zinc-100 text-zinc-700",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/15",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/15",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTones; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-transparent", badgeTones[tone])}>
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-zinc-200/70", className)} />;
}
