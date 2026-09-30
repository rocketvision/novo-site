import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartnerPageEditor } from "@/components/cms/alliance/page-editor";
import { requirePermission } from "@/server/authz/guard";
import { getPartner } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Página exclusiva · Rocket Alliance" };

export default async function PartnerPageBlocks({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("alliance.publish", `/cms/alliance/parceiros/${id}/pagina`);
  const partner = await getPartner(id);
  if (!partner) notFound();
  const { row, input, page } = partner;
  return (
    <PartnerPageEditor
      partnerId={row.id}
      partnerName={row.tradeName}
      slug={row.slug}
      initial={page}
      version={row.version}
      perms={{ canPublish: true, published: partner.published }}
      hints={{
        specialties: input.specialties.length + input.services.length,
        projects: input.projectIds.length,
        gallery: input.gallery.length,
        testimonials: input.testimonials.filter((t) => t.approved).length,
        website: Boolean(input.websiteUrl),
      }}
    />
  );
}
