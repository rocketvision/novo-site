import { Tabs } from "@/components/cms/ui/tabs";
import { requirePermission } from "@/server/authz/guard";

export default async function AllianceSettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("alliance.settings", "/cms/alliance/configuracoes");
  return (
    <>
      <Tabs
        label="Configurações"
        items={[
          { href: "/cms/alliance/configuracoes", label: "Programa" },
          { href: "/cms/alliance/configuracoes/auditoria", label: "Auditoria" },
        ]}
      />
      {children}
    </>
  );
}
