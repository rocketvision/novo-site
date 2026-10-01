import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { PartnerEditor } from "@/components/cms/alliance/partner-editor";
import type { PartnerSnapshot } from "@/lib/alliance/types";
import { requirePermission } from "@/server/authz/guard";
import { getDb, schema } from "@/server/db";
import { getMediaByIds } from "@/server/media/service";
import { getPartner } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Parceiro · Rocket Alliance" };

export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("alliance.view", `/cms/alliance/parceiros/${id}`);
  const partner = await getPartner(id);
  if (!partner) notFound();
  const { row, input } = partner;
  const [media, projects] = await Promise.all([
    getMediaByIds([input.logoMediaId, input.logoAltMediaId, input.coverMediaId, input.ogMediaId, ...input.gallery.map((g) => g.mediaId)].filter(Boolean) as string[]),
    getDb().select({ id: schema.projects.id, name: schema.projects.name, status: schema.projects.status }).from(schema.projects).orderBy(asc(schema.projects.name)),
  ]);
  return (
    <PartnerEditor
      id={row.id}
      initial={{
        data: input,
        version: row.version,
        published: partner.published,
        hasChanges: partner.hasChanges,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        publicSlug: (row.publishedSnapshot as PartnerSnapshot | null)?.slug ?? null,
      }}
      media={Object.fromEntries([...media.values()].map((m) => [m.id, { id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height, filename: m.filename, blurDataUrl: m.blurDataUrl }]))}
      projects={projects}
      perms={{ canEdit: user.permissions.has("alliance.partners"), canPublish: user.permissions.has("alliance.publish"), canUpload: user.permissions.has("media.upload") }}
    />
  );
}
