import { Tabs } from "@/components/cms/ui/tabs";
import { requirePermission } from "@/server/authz/guard";

export default async function ResourcesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("alliance.resources", "/cms/alliance/recursos");
  return (
    <>
      <Tabs
        label="Recursos"
        items={[
          { href: "/cms/alliance/recursos", label: "Materiais" },
          { href: "/cms/alliance/recursos/oportunidades", label: "Oportunidades" },
        ]}
      />
      {children}
    </>
  );
}
