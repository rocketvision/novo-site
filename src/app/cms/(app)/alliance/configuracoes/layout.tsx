import { AllianceSubNav } from "@/components/cms/alliance/alliance-nav";
import { requirePermission } from "@/server/authz/guard";

export default async function AllianceSettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("alliance.settings", "/cms/alliance/configuracoes");
  return (
    <>
      <AllianceSubNav
        label="Configurações"
        tabs={[
          { href: "/cms/alliance/configuracoes", label: "Programa" },
          { href: "/cms/alliance/configuracoes/auditoria", label: "Auditoria" },
        ]}
      />
      {children}
    </>
  );
}
