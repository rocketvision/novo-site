import { CommunicationsTabs } from "@/components/cms/alliance/communications-tabs";
import { requirePermission } from "@/server/authz/guard";

export default async function CommunicationsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("alliance.communications", "/cms/alliance/comunicacoes");
  return (
    <>
      <CommunicationsTabs />
      {children}
    </>
  );
}
