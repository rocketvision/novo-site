"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/cms/ui/tabs";

/** Comunicados e o histórico de e-mails. O Suporte tem item próprio no menu lateral e não mostra estas abas. */
export function CommunicationsTabs() {
  const pathname = usePathname();
  if (pathname.startsWith("/cms/alliance/comunicacoes/suporte")) return null;
  return (
    <Tabs
      label="Comunicações"
      items={[
        { href: "/cms/alliance/comunicacoes", label: "Comunicados", exact: true },
        { href: "/cms/alliance/comunicacoes/envios", label: "E-mails enviados" },
      ]}
    />
  );
}
