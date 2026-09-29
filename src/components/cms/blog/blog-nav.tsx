import Link from "next/link";
import { cn } from "@/lib/utils";

/** Abas do módulo Blog no Studio. Cada aba só aparece para quem tem a permissão dela. */
export function BlogNav({ current, show }: { current: "artigos" | "categorias" | "autores" | "perfil"; show: { categories: boolean; authors: boolean; profile: boolean } }) {
  const items = [
    { key: "artigos", label: "Artigos", href: "/cms/blog", visible: true },
    { key: "categorias", label: "Categorias", href: "/cms/blog/categorias", visible: show.categories },
    { key: "autores", label: "Autores", href: "/cms/blog/autores", visible: show.authors },
    { key: "perfil", label: "Meu perfil de autor", href: "/cms/blog/perfil", visible: show.profile },
  ].filter((i) => i.visible);
  if (items.length < 2) return null;
  return (
    <nav aria-label="Blog" className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-200">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={current === i.key ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 py-2 text-[13px] font-medium",
            current === i.key ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
