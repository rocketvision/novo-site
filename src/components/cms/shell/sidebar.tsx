"use client";

import { siteHref } from "@/lib/cms/site-link";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  FolderKanban,
  Handshake,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Menu,
  PanelsTopLeft,
  ScrollText,
  Settings,
  Users,
  X,
} from "lucide-react";
import { StudioLogo } from "@/components/cms/brand";
import { isActivePath, type NavIcon, type NavItem, type NavSection } from "@/components/cms/shell/nav";
import { api } from "@/lib/cms/api";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  landing: PanelsTopLeft,
  blog: Newspaper,
  projects: FolderKanban,
  diagnostics: ClipboardCheck,
  agenda: CalendarDays,
  alliance: Handshake,
  media: ImageIcon,
  users: Users,
  audit: ScrollText,
  settings: Settings,
};

/**
 * Menu lateral do Studio: as áreas agrupadas (Site, Comercial, Sistema) e, na área aberta, os subitens
 * dela. É a única navegação entre seções: as páginas não repetem abas de seção no topo.
 */
export function Sidebar({ sections, user }: { sections: NavSection[]; user: { name: string; email: string; roleName: string } }) {
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

  const isActive = (href: string) => isActivePath(pathname, { href, exact: href === "/cms" });

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
      <div className="flex h-16 items-center px-[18px]">
        <StudioLogo compact />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-1 pb-4">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className={cn(i > 0 && "mt-5")}>
            {section.title && <p className="mb-1 px-2.5 text-[11px] font-semibold tracking-[0.08em] text-zinc-400 uppercase">{section.title}</p>}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarItem key={item.href} item={item} pathname={pathname} onNavigate={() => setOpen(false)} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 border-t border-zinc-200 p-2">
        <Link
          href="/cms/conta"
          onClick={() => setOpen(false)}
          aria-current={isActive("/cms/conta") ? "page" : undefined}
          title="Minha conta"
          className={cn("flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-zinc-100/70", isActive("/cms/conta") && "bg-zinc-100")}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-semibold text-zinc-700">
            {initials(user.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-zinc-900">{user.name}</span>
            <span className="block truncate text-xs text-zinc-500">{user.roleName}</span>
          </span>
        </Link>
        <a
          href={siteHref("/")}
          target="_blank"
          rel="noopener"
          title="Ver site"
          aria-label="Ver site (abre em nova aba)"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </a>
        <button
          type="button"
          onClick={logout}
          disabled={leaving}
          title="Sair"
          aria-label="Sair"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
        >
          <LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-zinc-200 bg-white lg:block">{nav}</aside>

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

function Count({ value, active }: { value?: number; active?: boolean }) {
  if (!value) return null;
  return (
    <span
      className={cn("ml-auto rounded-full px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums", active ? "bg-zinc-900 text-white" : "bg-sky-100 text-sky-800")}
      aria-label={`${value} pendentes`}
    >
      {value}
    </span>
  );
}

/** Área do menu. Com subitens, eles aparecem só quando a área está aberta (página atual dentro dela). */
function SidebarItem({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  const Icon = ICONS[item.icon];
  const inArea = isActivePath(pathname, { href: item.href, exact: item.exact });
  const children = item.children ?? [];
  const showChildren = inArea && children.length > 1;
  const active = inArea && !showChildren;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
          active ? "bg-zinc-100 text-zinc-900" : inArea ? "text-zinc-900" : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900",
        )}
      >
        {active && <span aria-hidden="true" className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-accent" />}
        <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{item.label}</span>
        {!showChildren && <Count value={item.badge} />}
      </Link>
      {showChildren && (
        <ul className="mt-0.5 mb-2 ml-[17px] space-y-px border-l border-zinc-200 pl-2">
          {children.map((child) => {
            const on = isActivePath(pathname, child);
            return (
              <li key={child.href + child.label}>
                {child.group && <p className="mt-2.5 mb-0.5 px-2 text-[10px] font-semibold tracking-[0.1em] text-zinc-400 uppercase first:mt-1">{child.group}</p>}
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "relative flex h-7 items-center gap-2 rounded-md px-2 text-[13px] transition-colors",
                    on ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900",
                  )}
                >
                  {on && <span aria-hidden="true" className="absolute top-1 bottom-1 -left-[9px] w-0.5 rounded-full bg-accent" />}
                  <span className="truncate">{child.label}</span>
                  <Count value={child.badge} active={on} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
