import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FilePen, Plus } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/cms/ui/layout";
import { ButtonLink } from "@/components/cms/ui/button";
import { SECTIONS } from "@/lib/content/sections";
import { relativeTime } from "@/lib/cms/format";
import { redirect } from "next/navigation";
import { isBlogOnly, requireUser } from "@/server/authz/guard";
import { getDashboard } from "@/server/cms/dashboard";
import { countDiagnosticsByStatus } from "@/server/diagnostics/service";

export const metadata: Metadata = { title: "Visão geral" };

export default async function DashboardPage() {
  const user = await requireUser("/cms");
  if (isBlogOnly(user.permissions)) redirect("/cms/blog");
  const canAudit = user.permissions.has("audit.view");
  const { counts, pendingSections, pendingProjects, activity } = await getDashboard({ onlyActorId: canAudit ? undefined : user.id });
  const canLanding = user.permissions.has("landing.view");
  const canProjects = user.permissions.has("projects.view");
  const canDiagnostics = user.permissions.has("diagnostics.view");
  const diagnostics = canDiagnostics ? await countDiagnosticsByStatus() : null;
  const newDiagnostics = diagnostics?.novo ?? 0;

  const pending = [
    ...(canLanding
      ? pendingSections.filter((s) => !SECTIONS.find((x) => x.key === s.key)?.retired).map((s) => {
          const meta = SECTIONS.find((x) => x.key === s.key);
          const href = meta?.area === "settings" ? "/cms/configuracoes" : `/cms/landing/${meta?.slug}`;
          return { key: `s-${s.key}`, label: meta?.label ?? s.key, kind: "Seção", href, date: s.draftUpdatedAt };
        })
      : []),
    ...(canProjects
      ? pendingProjects.map((p) => ({
          key: `p-${p.id}`,
          label: p.name,
          kind: p.status === "draft" ? "Projeto em rascunho" : "Projeto com alterações",
          href: `/cms/projetos/${p.id}`,
          date: p.updatedAt,
        }))
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Visão geral"
        actions={
          <>
            {user.permissions.has("projects.create") && (
              <ButtonLink href="/cms/projetos/novo" size="sm">
                <Plus className="size-4" /> Novo projeto
              </ButtonLink>
            )}
            {canLanding && (
              <ButtonLink href="/cms/landing" variant="secondary" size="sm">
                <FilePen className="size-4" /> Editar landing
              </ButtonLink>
            )}
          </>
        }
      />

      {/* Diagnósticos novos (quiz do site) esperando retorno. */}
      {canDiagnostics && newDiagnostics > 0 && (
        <Link
          href="/cms/diagnosticos?etapa=novo"
          className="group mb-6 flex items-center justify-between gap-4 rounded-lg border border-sky-200 bg-sky-50 px-5 py-4 transition-colors hover:bg-sky-100/70"
        >
          <span>
            <span className="block text-sm font-medium text-sky-900">
              {newDiagnostics === 1 ? "1 diagnóstico novo esperando retorno" : `${newDiagnostics} diagnósticos novos esperando retorno`}
            </span>
            <span className="block text-xs text-sky-800/70">Respondidos no site. Chame no WhatsApp e avance a etapa.</span>
          </span>
          <ArrowRight aria-hidden="true" className="size-4 text-sky-700 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {canProjects && (
        <div className="mb-6 grid grid-cols-3 divide-x divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {(
            [
              ["Publicados", counts.published, "published"],
              ["Rascunhos", counts.draft, "draft"],
              ["Arquivados", counts.archived, "archived"],
            ] as const
          ).map(([label, value, status]) => (
            <Link key={status} href={`/cms/projetos?status=${status}`} className="px-5 py-4 hover:bg-zinc-50">
              <p className="text-[13px] text-zinc-500">Projetos {label.toLowerCase()}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Pendências" description="Rascunhos que ainda não estão no site." className="lg:col-span-3">
          {pending.length === 0 ? (
            <p className="text-sm text-zinc-500">Nada pendente. Tudo o que foi editado está publicado.</p>
          ) : (
            <ul className="-my-2 divide-y divide-zinc-100">
              {pending.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="group flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-900">{item.label}</span>
                      <span className="block text-xs text-zinc-500">
                        {item.kind} · alterado {relativeTime(item.date)}
                      </span>
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 text-zinc-300 transition-colors group-hover:text-zinc-600" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={canAudit ? "Atividade recente" : "Sua atividade recente"} className="lg:col-span-2">
          {activity.length === 0 ? (
            <EmptyState title="Nenhuma atividade ainda." />
          ) : (
            <ol className="-my-1 space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="text-[13px]">
                  <p className="text-zinc-800">{a.summary}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {a.actorName ?? a.actorEmail ?? "Sistema"} · {relativeTime(a.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
          {canAudit && activity.length > 0 && (
            <Link href="/cms/auditoria" className="mt-4 inline-block text-[13px] text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
              Ver auditoria completa
            </Link>
          )}
        </Panel>
      </div>
    </>
  );
}
