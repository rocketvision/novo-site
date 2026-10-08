import { Tabs } from "@/components/cms/ui/tabs";
import { requirePermission } from "@/server/authz/guard";

/** Financeiro do programa: só quem tem `alliance.finance` (o admin comum não tem por padrão). */
export default async function CommissionsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("alliance.finance", "/cms/alliance/comissoes");
  return (
    <>
      <Tabs
        label="Comissões"
        items={[
          { href: "/cms/alliance/comissoes", label: "Lançamentos" },
          { href: "/cms/alliance/comissoes/recebimentos", label: "Recebimentos" },
          { href: "/cms/alliance/comissoes/pagamentos", label: "Pagamentos" },
          { href: "/cms/alliance/comissoes/regras", label: "Regras" },
        ]}
      />
      {children}
    </>
  );
}
