import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/cms/ui/button";
import { PageHeader } from "@/components/cms/ui/layout";
import { ProjectList } from "@/components/cms/projects/project-list";
import { projectListQuerySchema } from "@/lib/validation/projects";
import { requirePermission } from "@/server/authz/guard";
import { countProjectsByStatus, listProjects } from "@/server/projects/service";

export const metadata: Metadata = { title: "Projetos" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("projects.view", "/cms/projetos");
  const sp = await searchParams;
  const parsed = projectListQuerySchema.safeParse({ q: typeof sp.q === "string" ? sp.q : undefined, status: typeof sp.status === "string" ? sp.status : undefined });
  const q = parsed.success ? (parsed.data.q ?? "") : "";
  const status = parsed.success ? (parsed.data.status ?? "") : "";

  const [rows, counts] = await Promise.all([listProjects({ q, status: status || undefined }), countProjectsByStatus()]);

  return (
    <div>
      <PageHeader
        title="Projetos"
        description="Portfólio exibido em /projetos. Só projetos publicados aparecem no site."
        actions={
          user.permissions.has("projects.create") && (
            <ButtonLink href="/cms/projetos/novo" size="sm">
              <Plus className="size-4" /> Novo projeto
            </ButtonLink>
          )
        }
      />
      <ProjectList
        key={`${q}|${status}`}
        rows={rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString(), coverUrl: r.coverUrl ?? null }))}
        q={q}
        status={status}
        counts={counts}
        perms={{ canEdit: user.permissions.has("projects.edit"), canCreate: user.permissions.has("projects.create") }}
      />
    </div>
  );
}
