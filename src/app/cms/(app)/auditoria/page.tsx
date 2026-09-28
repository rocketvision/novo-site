import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonClass } from "@/components/cms/ui/button";
import { Input, Select } from "@/components/cms/ui/field";
import { EmptyState, PageHeader } from "@/components/cms/ui/layout";
import { describeUserAgent } from "@/lib/cms/user-agent";
import { formatDateTime, relativeTime } from "@/lib/cms/format";
import { SECTIONS } from "@/lib/content/sections";
import { auditQuerySchema } from "@/lib/validation/audit";
import { requirePermission } from "@/server/authz/guard";
import { AUDIT_CATEGORIES, auditActors, queryAudit, type AuditCategory } from "@/server/audit-log/query";

export const metadata: Metadata = { title: "Auditoria" };

type Search = Promise<Record<string, string | string[] | undefined>>;

/** Rótulos dos campos mais comuns nos registros de alteração. */
const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  role: "Função",
  status: "Situação",
  alt: "Texto alternativo",
  filename: "Nome do arquivo",
  dimensions: "Dimensões",
  featured: "Destaque",
  permissions: "Permissões",
  description: "Descrição",
  slug: "Endereço",
  summary: "Resumo",
};

function resourceHref(type: string, id: string | null) {
  if (!id) return null;
  if (type === "section") {
    const section = SECTIONS.find((s) => s.key === id);
    if (!section) return null;
    return section.area === "settings" ? "/cms/configuracoes" : `/cms/landing/${section.slug}`;
  }
  if (type === "project") return `/cms/projetos/${id}`;
  if (type === "media") return "/cms/midia";
  if (type === "user" || type === "role") return "/cms/usuarios";
  return null;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "vazio";
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (Array.isArray(value)) return value.length === 0 ? "vazio" : value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function fieldLabel(path: string) {
  return path
    .split(".")
    .map((part) => (/^\d+$/.test(part) ? `#${Number(part) + 1}` : (FIELD_LABELS[part] ?? part)))
    .join(" › ");
}

export default async function AuditPage({ searchParams }: { searchParams: Search }) {
  await requirePermission("audit.view", "/cms/auditoria");
  const sp = await searchParams;
  const parsed = auditQuerySchema.safeParse(Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string" && v !== "")));
  const filters = parsed.success ? parsed.data : {};

  const [{ items, nextBefore }, actors] = await Promise.all([
    queryAudit({ category: filters.categoria as AuditCategory | undefined, actorId: filters.pessoa, from: filters.de, to: filters.ate, before: filters.antes }),
    auditActors(),
  ]);

  const baseParams = new URLSearchParams();
  for (const key of ["categoria", "pessoa", "de", "ate"] as const) if (filters[key]) baseParams.set(key, String(filters[key]));
  const nextHref = nextBefore ? `/cms/auditoria?${new URLSearchParams([...baseParams, ["antes", String(nextBefore)]])}` : null;
  const filtered = baseParams.size > 0 || Boolean(filters.antes);

  return (
    <div className="max-w-5xl">
      <PageHeader title="Auditoria" description="Tudo o que foi feito no CMS: quem, o quê, quando e de onde. O registro não guarda senhas nem tokens." />

      {/* Formulário GET: os filtros ficam na URL e funcionam sem JavaScript. */}
      <form method="get" className="mb-5 grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto] lg:items-end">
        <label className="text-[13px] font-medium text-zinc-900">
          Tipo
          <Select name="categoria" defaultValue={filters.categoria ?? ""} className="mt-1.5">
            <option value="">Todos</option>
            {Object.entries(AUDIT_CATEGORIES).map(([key, c]) => (
              <option key={key} value={key}>{c.label}</option>
            ))}
          </Select>
        </label>
        <label className="text-[13px] font-medium text-zinc-900">
          Pessoa
          <Select name="pessoa" defaultValue={filters.pessoa ?? ""} className="mt-1.5">
            <option value="">Todas</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </label>
        <label className="text-[13px] font-medium text-zinc-900">
          De
          <Input type="date" name="de" defaultValue={filters.de ?? ""} className="mt-1.5" />
        </label>
        <label className="text-[13px] font-medium text-zinc-900">
          Até
          <Input type="date" name="ate" defaultValue={filters.ate ?? ""} className="mt-1.5" />
        </label>
        <div className="flex gap-2">
          <button type="submit" className={buttonClass("primary", "md")}>Filtrar</button>
          {filtered && <Link href="/cms/auditoria" className={buttonClass("ghost", "md")}>Limpar</Link>}
        </div>
      </form>

      {!parsed.success && <p className="mb-4 text-[13px] text-amber-700">Alguns filtros eram inválidos e foram ignorados.</p>}

      {items.length === 0 ? (
        <EmptyState title={filtered ? "Nenhum registro com esses filtros." : "Nenhum registro ainda."} />
      ) : (
        <ol className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {items.map((item) => {
            const changes = (item.changes ?? null) as Record<string, { before: unknown; after: unknown }> | null;
            // Registro de algo excluído não leva a lugar nenhum.
            const href = item.action.endsWith(".deleted") ? null : resourceHref(item.resourceType, item.resourceId);
            const who = item.actorName ?? item.actorEmail ?? "Sistema";
            const hasDetails = Boolean(changes && Object.keys(changes).length) || item.ipAddress || item.userAgent;
            const row = (
              <div className="flex items-start gap-3 px-4 py-3">
                {hasDetails ? (
                  <ChevronRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" />
                ) : (
                  <span className="size-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-900">{item.summary}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {who} · <time dateTime={item.createdAt.toISOString()} title={formatDateTime(item.createdAt)}>{relativeTime(item.createdAt)}</time>
                    <span className="hidden sm:inline"> · {item.action}</span>
                  </p>
                </div>
                {href && (
                  <Link href={href} className="shrink-0 text-xs text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline">
                    Abrir
                  </Link>
                )}
              </div>
            );
            return (
              <li key={item.id}>
                {hasDetails ? (
                  <details className="group">
                    <summary className="cursor-pointer list-none hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">{row}</summary>
                    <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 pl-11 text-[13px]">
                      {changes && Object.keys(changes).length > 0 && (
                        <table className="w-full table-fixed">
                          <thead className="text-left text-xs text-zinc-500">
                            <tr>
                              <th scope="col" className="w-1/4 pb-1.5 font-medium">Campo</th>
                              <th scope="col" className="pb-1.5 font-medium">Antes</th>
                              <th scope="col" className="pb-1.5 font-medium">Depois</th>
                            </tr>
                          </thead>
                          <tbody className="align-top">
                            {Object.entries(changes).map(([field, change]) => (
                              <tr key={field} className="border-t border-zinc-200/70">
                                <td className="py-1.5 pr-3 text-zinc-600">{fieldLabel(field)}</td>
                                <td className="py-1.5 pr-3 break-words text-red-800/80 line-through decoration-red-300">{formatValue(change.before)}</td>
                                <td className="py-1.5 break-words text-emerald-900">{formatValue(change.after)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <p className="mt-2 text-xs text-zinc-500">
                        {formatDateTime(item.createdAt)}
                        {item.ipAddress && ` · IP ${item.ipAddress}`}
                        {item.userAgent && ` · ${describeUserAgent(item.userAgent)}`}
                      </p>
                    </div>
                  </details>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ol>
      )}

      {nextHref && (
        <div className="mt-5 flex justify-center">
          <Link href={nextHref} className={buttonClass("secondary", "sm")}>Registros mais antigos</Link>
        </div>
      )}
    </div>
  );
}
