import { AllianceSubNav } from "@/components/cms/alliance/alliance-nav";
import { requirePermission } from "@/server/authz/guard";
import { allianceBadges } from "@/server/alliance/overview";

export default async function CommunicationsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("alliance.communications", "/cms/alliance/comunicacoes");
  const badges = await allianceBadges();
  return (
    <>
      <AllianceSubNav
        label="Comunicações"
        tabs={[
          { href: "/cms/alliance/comunicacoes", label: "Comunicados" },
          { href: "/cms/alliance/comunicacoes/suporte", label: "Suporte", badge: badges.tickets },
          { href: "/cms/alliance/comunicacoes/envios", label: "E-mails enviados" },
        ]}
      />
      {children}
    </>
  );
}
