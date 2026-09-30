import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionEditor } from "@/components/cms/content/section-editor";
import { PageHeader } from "@/components/cms/ui/layout";
import { sectionByKey } from "@/lib/content/sections";
import { requirePermission } from "@/server/authz/guard";
import { loadEditor } from "@/server/content/editor";

export const metadata: Metadata = { title: "Página do programa · Rocket Alliance" };

/** Textos editáveis de /partners (os nomes e textos oficiais vêm preenchidos; mudar exige publicar). */
export default async function ProgramPageEditor() {
  const user = await requirePermission("alliance.publish", "/cms/alliance/paginas/programa");
  const section = sectionByKey("alliance");
  const { initial, media } = await loadEditor("alliance");
  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link href="/cms/alliance/paginas" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Páginas
          </Link>
        }
        title={section.label}
        description={`${section.description} Modalidades e níveis são editados em Configurações.`}
      />
      <SectionEditor
        sectionKey="alliance"
        label={section.label}
        initial={initial}
        media={media}
        previewPath="/partners"
        perms={{ canEdit: true, canPublish: true, canUpload: user.permissions.has("media.upload") }}
      />
    </div>
  );
}
