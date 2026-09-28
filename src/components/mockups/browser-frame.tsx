import { cn } from "@/lib/utils";

/** Moldura de navegador minimalista para os mockups de interface. */
export function BrowserFrame({
  children,
  className,
  address = "suaempresa.com.br",
  dark = false,
}: {
  children: React.ReactNode;
  className?: string;
  address?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl ring-1",
        dark ? "bg-ink-soft ring-white/10" : "bg-white ring-black/[0.06]",
        className,
      )}
    >
      <div className={cn("flex h-9 shrink-0 items-center gap-3 px-3.5", dark ? "border-b border-white/5" : "border-b border-black/[0.05]")}>
        <div className="flex gap-1.5">
          <span className={cn("size-2.5 rounded-full", dark ? "bg-white/15" : "bg-black/10")} />
          <span className={cn("size-2.5 rounded-full", dark ? "bg-white/15" : "bg-black/10")} />
          <span className={cn("size-2.5 rounded-full", dark ? "bg-white/15" : "bg-black/10")} />
        </div>
        <div
          className={cn(
            "mx-auto flex h-5.5 w-full max-w-60 items-center justify-center rounded-md font-mono text-[0.625rem]",
            dark ? "bg-white/5 text-white/40" : "bg-black/[0.035] text-black/40",
          )}
        >
          {address}
        </div>
        <div className="w-10" />
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

/** Barra de texto placeholder. */
export function Bar({ className }: { className?: string }) {
  return <span className={cn("block h-2 rounded-full bg-black/[0.07]", className)} />;
}
