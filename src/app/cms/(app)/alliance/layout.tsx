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
    { group: "Operação", href: "/cms/alliance", label: "Visão geral", permission: null },
    { group: "Operação", href: "/cms/alliance/candidaturas", label: "Candidaturas", permission: "alliance.applications", badge: badges.applications },
    { group: "Operação", href: "/cms/alliance/parceiros", label: "Parceiros", permission: null, badge: badges.changeRequests },
    { group: "Operação", href: "/cms/alliance/indicacoes", label: "Indicações", permission: null, badge: badges.referrals },
    { group: "Operação", href: "/cms/alliance/comissoes", label: "Comissões", permission: "alliance.finance" },
    { group: "Operação", href: "/cms/alliance/comunicacoes/suporte", label: "Suporte", permission: "alliance.communications", badge: badges.tickets },
    { group: "Conteúdo", href: "/cms/alliance/diretorio", label: "Diretório", permission: "alliance.publish" },
    { group: "Conteúdo", href: "/cms/alliance/paginas", label: "Páginas", permission: "alliance.publish" },
    { group: "Conteúdo", href: "/cms/alliance/recursos", label: "Recursos", permission: "alliance.resources" },
    { group: "Conteúdo", href: "/cms/alliance/comunicacoes", label: "Comunicados", permission: "alliance.communications", exclude: ["/cms/alliance/comunicacoes/suporte"] },
    { group: "Administração", href: "/cms/alliance/contratos", label: "Contratos", permission: "alliance.contracts" },
    { group: "Administração", href: "/cms/alliance/configuracoes", label: "Configurações", permission: "alliance.settings" },
  ];
  const tabs = all.filter((t) => t.permission === null || user.permissions.has(t.permission)).map((t) => ({ href: t.href, label: t.label, badge: t.badge, group: t.group, exclude: t.exclude }));
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
