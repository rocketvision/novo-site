import { AllianceSubNav } from "@/components/cms/alliance/alliance-nav";
import { requirePermission } from "@/server/authz/guard";

export default async function ResourcesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("alliance.resources", "/cms/alliance/recursos");
  return (
    <>
      <AllianceSubNav
        label="Recursos"
        tabs={[
          { href: "/cms/alliance/recursos", label: "Materiais" },
          { href: "/cms/alliance/recursos/oportunidades", label: "Oportunidades" },
        ]}
      />
      {children}
    </>
  );
}
