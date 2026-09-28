import Link from "next/link";
import { cn } from "@/lib/utils";

export function UsersTabs({ active }: { active: "people" | "roles" }) {
  const tabs = [
    { key: "people", label: "Pessoas", href: "/cms/usuarios" },
    { key: "roles", label: "Funções e permissões", href: "/cms/usuarios/funcoes" },
  ] as const;
  return (
    <nav aria-label="Seções de usuários" className="mb-5 flex gap-4 border-b border-zinc-200">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={cn("-mb-px border-b-2 pb-2 text-[13px]", active === t.key ? "border-zinc-900 font-medium text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
