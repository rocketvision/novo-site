"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Building2, FolderOpen, Inbox, LayoutDashboard, LifeBuoy, Lightbulb, LogOut, Menu, UserRound, UsersRound, Wallet, X } from "lucide-react";
import { HubLogo } from "./brand";
import { api } from "@/lib/cms/api";
import { cn } from "@/lib/utils";

export type HubNavKey = "dashboard" | "referrals" | "earnings" | "resources" | "opportunities" | "support" | "company" | "team" | "notices" | "account";

const ITEMS: { key: HubNavKey; label: string; hint: string; href: string; icon: typeof Inbox }[] = [
  { key: "dashboard", label: "Painel", hint: "Visão geral", href: "/alliance", icon: LayoutDashboard },
  { key: "referrals", label: "Indicações", hint: "Funil de indicações", href: "/alliance/indicacoes", icon: Inbox },
  { key: "earnings", label: "Ganhos", hint: "Comissões e pagamentos", href: "/alliance/ganhos", icon: Wallet },
  { key: "resources", label: "Materiais", hint: "Recursos para vender", href: "/alliance/recursos", icon: FolderOpen },
  { key: "opportunities", label: "Oportunidades", hint: "Projetos e campanhas", href: "/alliance/oportunidades", icon: Lightbulb },
  { key: "support", label: "Suporte", hint: "Fale com a Rocket", href: "/alliance/suporte", icon: LifeBuoy },
  { key: "company", label: "Minha empresa", hint: "Perfil e contratos", href: "/alliance/empresa", icon: Building2 },
  { key: "team", label: "Equipe", hint: "Acessos da empresa", href: "/alliance/equipe", icon: UsersRound },
];

/**
 * Estrutura do Alliance Hub: barra lateral escura com a marca do programa, navegação por área (só as
 * que o papel da pessoa permite) e o acesso rápido aos avisos e à conta.
 */
export function HubShell({ allowed, user, unread, children }: { allowed: HubNavKey[]; user: { name: string; company: string; role: string }; unread: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

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

  const active = (href: string) => (href === "/alliance" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  async function logout() {
    try {
      await api("/api/alliance/hub/auth/logout", { method: "POST" });
    } finally {
      router.replace("/alliance/login");
      router.refresh();
    }
  }

  const nav = (
    <nav aria-label="Alliance Hub" className="flex h-full flex-col bg-[#0a0a0c] text-white">
      <div className="flex h-16 items-center px-5">
        <Link href="/alliance" onClick={() => setOpen(false)}>
          <HubLogo dark />
        </Link>
      </div>
      <p className="mx-5 mt-2 mb-3 truncate rounded-md bg-white/[0.05] px-3 py-2 text-[12px] text-white/70 ring-1 ring-white/10">{user.company}</p>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
        {ITEMS.filter((i) => allowed.includes(i.key)).map((item) => {
          const on = active(item.href);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={on ? "page" : undefined}
                className={cn("group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors", on ? "bg-white/[0.08] text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white")}
              >
                {on && <span aria-hidden="true" className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-[#2c9df5]" />}
                <item.icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0">
                  <span className="block text-[13px] leading-tight font-medium">{item.label}</span>
                  <span className="block text-[11px] leading-tight text-white/40">{item.hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 p-3">
        <Link
          href="/alliance/conta"
          onClick={() => setOpen(false)}
          aria-current={active("/alliance/conta") ? "page" : undefined}
          className={cn("flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.04]", active("/alliance/conta") && "bg-white/[0.08]")}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold">{initials(user.name)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{user.name}</span>
            <span className="block truncate text-[11px] text-white/45">{user.role}</span>
          </span>
          <UserRound aria-hidden="true" className="size-4 text-white/40" strokeWidth={1.75} />
        </Link>
        <button type="button" onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/60 hover:bg-white/[0.04] hover:text-white">
          <LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} /> Sair
        </button>
      </div>
    </nav>
  );

  const bell = (
    <Link href="/alliance/avisos" aria-label={unread ? `Avisos, ${unread} não lidos` : "Avisos"} className="relative flex size-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
      <Bell className="size-[18px]" strokeWidth={1.75} />
      {unread > 0 && <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-[#2c9df5] px-1 text-[10px] leading-4 font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );

  return (
    <div className="lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{nav}</aside>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-3 backdrop-blur lg:px-10">
        <button type="button" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)} className="flex size-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 lg:hidden">
          <Menu className="size-5" />
        </button>
        <span className="hidden text-[13px] text-zinc-500 lg:block">O programa de parceiros da Rocket Vision</span>
        <span className="lg:hidden">
          <HubLogo />
        </span>
        {bell}
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-zinc-950/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
            <button type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} className="absolute top-4 right-3 z-10 flex size-8 items-center justify-center rounded-md text-white/60 hover:bg-white/10">
              <X className="size-4" />
            </button>
            {nav}
          </div>
        </div>
      )}
      <main id="conteudo" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
