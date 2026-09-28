import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-eyebrow flex items-center gap-2.5 text-muted", className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
      {children}
    </p>
  );
}
