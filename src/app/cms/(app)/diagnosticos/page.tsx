import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, MessageCircle } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { HandledToggle } from "@/components/cms/diagnostics/handled-toggle";
import { formatDateTime, relativeTime } from "@/lib/cms/format";
import { maskPhone } from "@/lib/diagnostic";
import { requirePermission } from "@/server/authz/guard";
import { listDiagnostics } from "@/server/diagnostics/service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Diagnósticos" };

type Search = Promise<Record<string, string | string[] | undefined>>;

/** Os diagnósticos enviados pelo quiz do site: quem é, o negócio, as respostas e o WhatsApp. */
export default async function DiagnosticsPage({ searchParams }: { searchParams: Search }) {
  await requirePermission("audit.view", "/cms/diagnosticos");
  const pending = (await searchParams).status === "pendentes";
  const items = await listDiagnostics({ pending });

  const tab = (active: boolean) => cn("rounded-md px-3 py-1.5 text-sm font-medium", active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100");

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Diagnósticos"
        description="Quem respondeu o diagnóstico no site. Chame no WhatsApp e marque como respondido para a equipe saber quem já teve retorno."
        actions={
          <nav className="flex gap-1" aria-label="Filtro">
            <Link href="/cms/diagnosticos" className={tab(!pending)}>
              Todos
            </Link>
            <Link href="/cms/diagnosticos?status=pendentes" className={tab(pending)}>
              Pendentes
            </Link>
          </nav>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="size-8" />} title={pending ? "Nenhum diagnóstico pendente." : "Nenhum diagnóstico ainda. Eles aparecem aqui assim que alguém responde o quiz no site."} />
      ) : (
        <ul className="space-y-3">
          {items.map((d) => (
            <li key={d.id} className={cn("rounded-lg border bg-white p-5", d.handledAt ? "border-zinc-200" : "border-sky-200 ring-1 ring-sky-100")}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-zinc-900">
                    {d.business} <span className="font-normal text-zinc-500">· {d.name}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500" title={formatDateTime(d.createdAt)}>
                    {relativeTime(d.createdAt)}
                    {d.source && <> · aberto em {d.source}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/55${d.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="size-3.5" aria-hidden="true" />
                    {maskPhone(d.whatsapp)}
                  </a>
                  <HandledToggle id={d.id} handled={Boolean(d.handledAt)} />
                </div>
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-zinc-500">Segmento</dt>
                  <dd className="text-zinc-800">{d.segment}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Hoje na internet</dt>
                  <dd className="text-zinc-800">{d.presence}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Problemas que enxerga</dt>
                  <dd className="text-zinc-800">{d.problems.join(", ")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Prazo</dt>
                  <dd className="text-zinc-800">{d.timing}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
