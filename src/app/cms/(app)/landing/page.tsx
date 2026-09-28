import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { Badge, PageHeader } from "@/components/cms/ui/layout";
import { buttonClass } from "@/components/cms/ui/button";
import { relativeTime } from "@/lib/cms/format";
import { LANDING_SECTIONS } from "@/lib/content/sections";
import { requirePermission } from "@/server/authz/guard";
import { listSectionStates } from "@/server/content/sections";

export const metadata: Metadata = { title: "Landing page" };

export default async function LandingPage() {
  await requirePermission("landing.view", "/cms/landing");
  const states = await listSectionStates();
  const pendingCount = LANDING_SECTIONS.filter((s) => states.get(s.key)?.hasChanges ?? true).length;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Landing page"
        description={
          pendingCount === 0
            ? "Seções na ordem em que aparecem no site. Tudo o que foi editado está publicado."
            : `Seções na ordem em que aparecem no site. ${pendingCount === 1 ? "1 seção tem" : `${pendingCount} seções têm`} rascunho não publicado.`
        }
        actions={
          <a href="/api/cms/preview?path=%2F" target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
            <ExternalLink className="size-3.5" /> Pré-visualizar com rascunhos
          </a>
        }
      />
      <ol className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {LANDING_SECTIONS.map((section, i) => {
          const state = states.get(section.key);
          const pending = state?.hasChanges ?? true;
          return (
            <li key={section.key}>
              <Link href={`/cms/landing/${section.slug}`} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-zinc-50 sm:px-5">
                <span className="w-5 shrink-0 text-xs text-zinc-400 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900">{section.label}</span>
                    {pending ? <Badge tone="amber">Rascunho não publicado</Badge> : <Badge tone="green">Publicado</Badge>}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-zinc-500">{section.description}</span>
                </span>
                <span className="hidden shrink-0 text-xs text-zinc-500 sm:block">
                  {state?.publishedAt ? `Publicado ${relativeTime(state.publishedAt)}` : "Nunca publicado"}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-zinc-300 group-hover:text-zinc-600" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
