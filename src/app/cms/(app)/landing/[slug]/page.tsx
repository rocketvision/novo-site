import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SectionEditor } from "@/components/cms/content/section-editor";
import { PageHeader } from "@/components/cms/ui/layout";
import { sectionBySlug } from "@/lib/content/sections";
import { requirePermission } from "@/server/authz/guard";
import { loadEditor } from "@/server/content/editor";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = sectionBySlug((await params).slug);
  return { title: section && section.area === "landing" ? section.label : "Seção não encontrada" };
}

export default async function LandingSectionPage({ params }: Props) {
  const { slug } = await params;
  const user = await requirePermission("landing.view", `/cms/landing/${slug}`);
  const section = sectionBySlug(slug);
  if (!section || section.area !== "landing") notFound();

  const { initial, media } = await loadEditor(section.key);

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link href="/cms/landing" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Landing page
          </Link>
        }
        title={section.label}
        description={section.description}
      />
      <SectionEditor
        sectionKey={section.key}
        label={section.label}
        initial={initial}
        media={media}
        previewPath={section.path.split("#")[0] || "/"}
        perms={{
          canEdit: user.permissions.has("landing.edit"),
          canPublish: user.permissions.has("landing.publish"),
          canUpload: user.permissions.has("media.upload"),
        }}
      />
    </div>
  );
}
