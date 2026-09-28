import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/cms/ui/layout";
import { ProjectEditor } from "@/components/cms/projects/project-editor";
import { requirePermission } from "@/server/authz/guard";

export const metadata: Metadata = { title: "Novo projeto" };

export default async function NewProjectPage() {
  const user = await requirePermission("projects.create", "/cms/projetos/novo");
  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link href="/cms/projetos" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Projetos
          </Link>
        }
        title="Novo projeto"
        description="O projeto começa como rascunho. Nada aparece no site até você publicar."
      />
      <ProjectEditor
        id={null}
        initial={{
          data: {
            name: "",
            slug: "",
            client: "",
            category: "",
            projectDate: "",
            summary: "",
            description: "",
            context: "",
            solution: "",
            results: "",
            services: [],
            highlights: [],
            brandColor: "#0a0a0b",
            accentColor: "#ff5b1f",
            tone: "light",
            coverMediaId: null,
            logoMediaId: null,
            ogMediaId: null,
            desktopMediaId: null,
            phoneMediaIds: [],
            gallery: [],
            externalUrl: "",
            seoTitle: "",
            seoDescription: "",
            featured: false,
          },
          version: 0,
          status: "draft",
          hasChanges: false,
          publishedAt: null,
          publishedByName: null,
          publicSlug: null,
          isSample: false,
        }}
        media={{}}
        perms={{
          canEdit: user.permissions.has("projects.edit"),
          canCreate: true,
          canPublish: user.permissions.has("projects.publish"),
          canArchive: user.permissions.has("projects.archive"),
          canDelete: user.permissions.has("projects.delete"),
          canUpload: user.permissions.has("media.upload"),
        }}
      />
    </div>
  );
}
