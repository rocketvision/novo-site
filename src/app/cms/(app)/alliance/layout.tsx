import { AllianceMark } from "@/components/alliance/alliance-logo";
import { AllianceNav, type AllianceTab } from "@/components/cms/alliance/alliance-nav";
import { PROGRAM } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import type { Permission } from "@/server/authz/permissions";
import { allianceBadges } from "@/server/alliance/overview";

/**
 * Área Rocket Alliance do Studio. Ver a área exige `alliance.view`; cada aba exige a permissão da
 * própria área (finanças, contratos e configurações são separadas), e cada página e rota confere de novo.
 */
export default async function AllianceLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("alliance.view", "/cms/alliance");
  const badges = await allianceBadges();
  const all: (AllianceTab & { permission: Permission | null })[] = [
    { href: "/cms/alliance", label: "Visão geral", permission: null },
    { href: "/cms/alliance/candidaturas", label: "Candidaturas", permission: "alliance.applications", badge: badges.applications },
    { href: "/cms/alliance/parceiros", label: "Parceiros", permission: null, badge: badges.changeRequests },
    { href: "/cms/alliance/diretorio", label: "Diretório", permission: "alliance.publish" },
    { href: "/cms/alliance/paginas", label: "Páginas", permission: "alliance.publish" },
    { href: "/cms/alliance/indicacoes", label: "Indicações", permission: null, badge: badges.referrals },
    { href: "/cms/alliance/comissoes", label: "Comissões", permission: "alliance.finance" },
    { href: "/cms/alliance/contratos", label: "Contratos", permission: "alliance.contracts" },
    { href: "/cms/alliance/recursos", label: "Recursos", permission: "alliance.resources" },
    { href: "/cms/alliance/comunicacoes", label: "Comunicações", permission: "alliance.communications", badge: badges.tickets },
    { href: "/cms/alliance/configuracoes", label: "Configurações", permission: "alliance.settings" },
  ];
  const tabs = all.filter((t) => t.permission === null || user.permissions.has(t.permission)).map((t) => ({ href: t.href, label: t.label, badge: t.badge }));
  return (
    <>
      <p className="mb-3 flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.16em] text-zinc-400 uppercase">
        <AllianceMark accent className="h-5 text-zinc-900" />
        {PROGRAM.name} · {PROGRAM.signature}
      </p>
      <AllianceNav tabs={tabs} />
      {children}
    </>
  );
}
