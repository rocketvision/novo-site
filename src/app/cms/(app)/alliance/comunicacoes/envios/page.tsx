import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader } from "@/components/cms/ui/layout";
import { RetryEmailButton } from "@/components/cms/alliance/library-admin";
import { formatDateTime } from "@/lib/cms/format";
import { requirePermission } from "@/server/authz/guard";
import { listEmailLog, TEMPLATE_LABELS } from "@/server/alliance/mail";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "E-mails · Rocket Alliance" };

const STATUS: Record<string, { label: string; tone: "neutral" | "green" | "red" | "amber" }> = {
  sent: { label: "Enviado", tone: "green" },
  failed: { label: "Falhou", tone: "red" },
  sending: { label: "Enviando", tone: "amber" },
  skipped: { label: "Não enviado", tone: "neutral" },
};

export default async function EmailLogPage({ searchParams }: { searchParams: Promise<{ status?: string; antes?: string }> }) {
  await requirePermission("alliance.communications", "/cms/alliance/comunicacoes/envios");
  const sp = await searchParams;
  const status = sp.status && STATUS[sp.status] ? sp.status : undefined;
  const before = sp.antes && !Number.isNaN(Date.parse(sp.antes)) ? new Date(sp.antes) : undefined;
  const { items, nextBefore } = await listEmailLog({ status, before });
  return (
    <div>
      <PageHeader title="E-mails enviados" description="Registro dos e-mails transacionais do programa. Cada evento gera no máximo um e-mail; os que falharam podem ser reenviados." />
      <nav aria-label="Filtrar" className="mb-4 flex flex-wrap gap-2">
        {[["", "Todos"], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <Link key={k} href={k ? `?status=${k}` : "?"} aria-current={(status ?? "") === k ? "page" : undefined} className={cn("rounded-full border px-3 py-1 text-[13px]", (status ?? "") === k ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400")}>
            {label}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">Nenhum e-mail.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px]">
              <span className="min-w-0">
                <span className="block font-medium text-zinc-900">{TEMPLATE_LABELS[e.template] ?? e.template}</span>
                <span className="mt-0.5 block truncate text-xs text-zinc-500">
                  {e.toEmail}
                  {e.partnerName ? ` · ${e.partnerName}` : ""} · {formatDateTime(e.createdAt)}
                  {e.attempts > 1 ? ` · ${e.attempts} tentativas` : ""}
                </span>
                {e.lastError && e.status !== "sent" && <span className="mt-0.5 block truncate text-xs text-red-700">{e.lastError}</span>}
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={STATUS[e.status]?.tone}>{STATUS[e.status]?.label ?? e.status}</Badge>
                {e.status === "failed" && e.canRetry && <RetryEmailButton id={e.id} />}
              </span>
            </li>
          ))}
        </ul>
      )}
      {nextBefore && (
        <div className="mt-4 text-center">
          <Link href={`?${new URLSearchParams({ ...(status && { status }), antes: nextBefore.toISOString() })}`} className="text-[13px] text-zinc-600 underline-offset-4 hover:underline">
            Mais antigos
          </Link>
        </div>
      )}
    </div>
  );
}
