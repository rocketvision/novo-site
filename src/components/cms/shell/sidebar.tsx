"use client";

import { siteHref } from "@/lib/cms/site-link";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  FolderKanban,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelsTopLeft,
  ScrollText,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { StudioLogo } from "@/components/cms/brand";
import { api } from "@/lib/cms/api";
import { cn } from "@/lib/utils";

export type NavKey = "dashboard" | "landing" | "projects" | "media" | "users" | "audit" | "settings";

const ITEMS: { key: NavKey; label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Visão geral", href: "/cms", icon: LayoutDashboard },
  { key: "landing", label: "Landing page", href: "/cms/landing", icon: PanelsTopLeft },
  { key: "projects", label: "Projetos", href: "/cms/projetos", icon: FolderKanban },
  { key: "media", label: "Mídia", href: "/cms/midia", icon: ImageIcon },
  { key: "users", label: "Usuários", href: "/cms/usuarios", icon: Users },
  { key: "audit", label: "Auditoria", href: "/cms/auditoria", icon: ScrollText },
  { key: "settings", label: "Configurações", href: "/cms/configuracoes", icon: Settings },
];

export function Sidebar({ allowed, user }: { allowed: NavKey[]; user: { name: string; email: string; roleName: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Fecha a gaveta com Esc e trava o scroll do fundo enquanto aberta. Ao navegar, o clique no link fecha.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/cms" ? pathname === "/cms" : pathname === href || pathname.startsWith(`${href}/`));

  async function logout() {
    setLeaving(true);
    try {
      await api("/api/cms/auth/logout", { method: "POST" });
    } finally {
      router.replace("/cms/login");
      router.refresh();
    }
  }

  const nav = (
    <nav aria-label="Principal" className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <StudioLogo compact />
      </div>

      <ul className="flex-1 space-y-0.5 px-2 py-2">
        {ITEMS.filter((item) => allowed.includes(item.key)).map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                  active ? "bg-zinc-100 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900",
                )}
              >
                {active && <span aria-hidden="true" className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-accent" />}
                <item.icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-zinc-200 p-2">
        <a
          href={siteHref("/")}
          target="_blank"
          rel="noopener"
          className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900"
        >
          <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Ver site
        </a>
        <Link
          href="/cms/conta"
          onClick={() => setOpen(false)}
          aria-current={isActive("/cms/conta") ? "page" : undefined}
          className={cn(
            "mt-1 flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-zinc-100/70",
            isActive("/cms/conta") && "bg-zinc-100",
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-semibold text-zinc-700">
            {initials(user.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-zinc-900">{user.name}</span>
            <span className="block truncate text-xs text-zinc-500">{user.roleName}</span>
          </span>
          <UserRound aria-hidden="true" className="size-4 text-zinc-400" strokeWidth={1.75} />
        </Link>
        <button
          type="button"
          onClick={logout}
          disabled={leaving}
          className="mt-1 flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900 disabled:opacity-50"
        >
          <LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Sair
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-zinc-200 bg-white lg:block">{nav}</aside>

      {/* Mobile: barra superior + gaveta */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-3 lg:hidden">
        <button
          type="button"
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="cms-drawer"
          onClick={() => setOpen(true)}
          className="flex size-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
        >
          <Menu className="size-5" />
        </button>
        <StudioLogo compact />
        <span className="size-9" />
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-zinc-950/30" onClick={() => setOpen(false)} />
          <div id="cms-drawer" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-zinc-200 bg-white shadow-xl">
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
            >
              <X className="size-4" />
            </button>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
