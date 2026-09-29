import Link from "next/link";
import { Search } from "lucide-react";
import type { PublicCategory } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

/** Abertura das páginas de lista do Blog: título, texto, categorias e busca. */
export function BlogHeader({
  eyebrow,
  title,
  lead,
  categories,
  current,
  query,
}: {
  eyebrow: React.ReactNode;
  title: string;
  lead?: string;
  categories: (PublicCategory & { count: number })[];
  current?: string;
  query?: string;
}) {
  return (
    <header className="container-page pt-[calc(var(--header-height)+3.5rem)] pb-10 md:pt-[calc(var(--header-height)+5rem)]">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <div className="text-eyebrow text-muted">{eyebrow}</div>
          <h1 className="text-hero mt-5 text-balance">{title}</h1>
        </div>
        {lead && <p className="text-lead text-muted lg:col-span-4">{lead}</p>}
      </div>
      <div className="mt-10 flex flex-col gap-4 border-y border-line py-4 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Categorias do Blog" className="-mx-1 flex gap-1 overflow-x-auto">
          <CategoryLink href="/blog" active={!current}>
            Todos
          </CategoryLink>
          {categories.map((c) => (
            <CategoryLink key={c.slug} href={`/blog/categoria/${c.slug}`} active={current === c.slug}>
              {c.name}
            </CategoryLink>
          ))}
        </nav>
        <form role="search" action="/blog" className="relative md:w-72">
          <label htmlFor="blog-busca" className="sr-only">
            Buscar no Blog
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <input
            id="blog-busca"
            type="search"
            name="q"
            defaultValue={query}
            minLength={2}
            maxLength={80}
            placeholder="Buscar artigos"
            className="h-10 w-full rounded-full bg-mist pr-4 pl-10 text-sm text-ink placeholder:text-subtle focus:ring-2 focus:ring-ink/15 focus:outline-none"
          />
        </form>
      </div>
    </header>
  );
}

function CategoryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors", active ? "bg-ink text-white" : "text-muted hover:bg-mist hover:text-ink")}
    >
      {children}
    </Link>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages < 2) return null;
  return (
    <nav aria-label="Páginas" className="mt-16 flex items-center justify-center gap-1">
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          aria-label={`Página ${p}`}
          className={cn("flex size-10 items-center justify-center rounded-full text-sm tabular-nums", p === page ? "bg-ink text-white" : "text-muted hover:bg-mist hover:text-ink")}
        >
          {p}
        </Link>
      ))}
    </nav>
  );
}
