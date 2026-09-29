import type { TocEntry } from "@/lib/blog/document";
import { cn } from "@/lib/utils";

/** Sumário do artigo: só os títulos de seção (h2) e subtítulos (h3). */
export function TableOfContents({ entries }: { entries: TocEntry[] }) {
  const items = entries.filter((e) => e.level <= 3);
  if (items.length < 2) return null;
  return (
    <nav aria-label="Neste artigo" className="text-sm">
      <p className="text-eyebrow text-subtle">Neste artigo</p>
      <ol className="mt-4 space-y-2.5 border-l border-line">
        {items.map((e) => (
          <li key={e.id} className={cn("-ml-px border-l border-transparent", e.level === 3 ? "pl-7" : "pl-4")}>
            <a href={`#${e.id}`} className="block leading-snug text-muted transition-colors hover:text-ink">
              {e.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
