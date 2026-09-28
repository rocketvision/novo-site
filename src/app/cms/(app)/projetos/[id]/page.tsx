import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/cms/ui/layout";
import { ProjectEditor } from "@/components/cms/projects/project-editor";
import type { ProjectSnapshot } from "@/lib/projects/types";
import { requirePermission } from "@/server/authz/guard";
import { getMediaByIds } from "@/server/media/service";
import { getProject } from "@/server/projects/service";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProject((await params).id);
  return { title: project ? project.row.name : "Projeto não encontrado" };
}

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const user = await requirePermission("projects.view", `/cms/projetos/${id}`);
  const project = await getProject(id);
  if (!project) notFound();

  const { row, input } = project;
  const ids = [input.coverMediaId, input.logoMediaId, input.ogMediaId, input.desktopMediaId, ...input.phoneMediaIds, ...input.gallery.map((g) => g.mediaId)].filter(Boolean) as string[];
  const media = await getMediaByIds(ids);

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link href="/cms/projetos" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Projetos
          </Link>
        }
        title={row.name}
      />
      <ProjectEditor
        id={row.id}
        initial={{
          data: input,
          version: row.version,
          status: row.status,
          hasChanges: project.hasChanges,
          publishedAt: row.publishedAt?.toISOString() ?? null,
          publishedByName: project.publishedByName,
          publicSlug: (row.publishedSnapshot as ProjectSnapshot | null)?.slug ?? null,
          isSample: row.isSample,
        }}
        media={Object.fromEntries([...media.values()].map((m) => [m.id, { id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height, filename: m.filename, blurDataUrl: m.blurDataUrl }]))}
        perms={{
          canEdit: user.permissions.has("projects.edit"),
          canCreate: user.permissions.has("projects.create"),
          canPublish: user.permissions.has("projects.publish"),
          canArchive: user.permissions.has("projects.archive"),
          canDelete: user.permissions.has("projects.delete"),
          canUpload: user.permissions.has("media.upload"),
        }}
      />
    </div>
  );
}
