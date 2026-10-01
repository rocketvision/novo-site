import type { Metadata } from "next";
import { PageHeader } from "@/components/cms/ui/layout";
import { DirectoryAdmin } from "@/components/cms/alliance/directory-admin";
import { requirePermission } from "@/server/authz/guard";
import { listPartners } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Diretório · Rocket Alliance" };

export default async function DirectoryPage() {
  await requirePermission("alliance.publish", "/cms/alliance/diretorio");
  const partners = await listPartners();
  return (
    <div className="max-w-4xl">
      <PageHeader title="Diretório público" description="Os parceiros publicados em /partners: ordem de exibição, destaques e pré-visualização." />
      <DirectoryAdmin rows={partners.map((p) => ({ id: p.id, tradeName: p.tradeName, slug: p.slug, logoUrl: p.logoUrl, featured: p.featured, published: p.published, hasChanges: p.hasChanges, status: p.status }))} />
    </div>
  );
}
