import type { Metadata } from "next";
import { ArrowUpRight, Download } from "lucide-react";
import { Badge, PageHeader, Panel } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { AcceptContract, ContactForm, PublicDataForm } from "@/components/hub/company-forms";
import { formatDateTime, formatDay } from "@/lib/cms/format";
import { CONTRACT_KINDS, CONTRACT_STATUSES, hubCan, isModalityKey, MODALITIES, TIERS, type TierKey } from "@/lib/alliance/constants";
import { requireHubSession } from "@/server/alliance/hub/guard";
import { hubCompany } from "@/server/alliance/company";
import { hubContracts } from "@/server/alliance/contracts";

export const metadata: Metadata = { title: "My Company" };

const REQUEST_STATUS: Record<string, { label: string; tone: "amber" | "green" | "red" | "neutral" }> = {
  pending: { label: "Aguardando aprovação", tone: "amber" },
  approved: { label: "Aprovado", tone: "green" },
  rejected: { label: "Não aprovado", tone: "red" },
  withdrawn: { label: "Substituído", tone: "neutral" },
};

export default async function HubCompanyPage() {
  const { user } = await requireHubSession();
  const canEdit = hubCan(user.role, "company.edit");
  const [company, contracts] = await Promise.all([hubCompany(user), hubContracts(user)]);
  const day = (d: string | null) => (d ? formatDay(new Date(`${d}T12:00:00Z`)) : "");
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Company"
        description="Dados da sua empresa no programa. O que aparece no site só muda depois da aprovação da Rocket Vision."
        actions={
          company.published && (
            <a href={`/partners/${company.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[13px] text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
              Ver página pública <ArrowUpRight className="size-3.5" />
            </a>
          )
        }
      />
      <div className="flex flex-wrap gap-2 text-[13px]">
        <Badge tone="blue">{TIERS[company.tierKey as TierKey]?.name ?? company.tierKey}</Badge>
        {company.modalities.map((m) => (
          <Badge key={m}>{isModalityKey(m) ? MODALITIES[m].name : m}</Badge>
        ))}
      </div>

      {canEdit && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Panel title="Perfil público" description="Diretório e página exclusiva em /partners." className="lg:col-span-3">
            <PublicDataForm initial={company.public} logoUrl={company.logoUrl} pending={company.requests.some((r) => r.status === "pending")} />
          </Panel>
          <div className="space-y-6 lg:col-span-2">
            <Panel title="Contato principal" description="Interno. Nunca aparece no site.">
              <ContactForm initial={company.contact} />
            </Panel>
            {company.requests.length > 0 && (
              <Panel title="Pedidos de alteração">
                <ul className="-my-2 divide-y divide-zinc-100">
                  {company.requests.map((r) => (
                    <li key={r.id} className="py-3 text-[13px]">
                      <Badge tone={REQUEST_STATUS[r.status]?.tone}>{REQUEST_STATUS[r.status]?.label ?? r.status}</Badge>
                      <p className="mt-1 text-xs text-zinc-500">Enviado em {formatDateTime(r.createdAt)}</p>
                      {r.reviewNote && r.status !== "withdrawn" && <p className="mt-1 text-zinc-700">{r.reviewNote}</p>}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      )}

      {hubCan(user.role, "contracts.view") && (
        <section id="contratos" className="scroll-mt-20">
          <Panel title="Contratos e termos">
            {contracts.length === 0 ? (
              <p className="text-[13px] text-zinc-500">Nenhum documento ainda. O termo de parceria chega aqui no onboarding.</p>
            ) : (
              <ul className="-my-2 divide-y divide-zinc-100">
                {contracts.map((c) => (
                  <li key={c.id} className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">{c.title}</p>
                      <span className="text-xs text-zinc-500">
                        {CONTRACT_KINDS.find((k) => k.key === c.kind)?.label} · versão {c.version}
                      </span>
                      <ToneBadge list={CONTRACT_STATUSES} value={c.status} />
                    </div>
                    {(c.startsOn || c.endsOn) && <p className="mt-1 text-xs text-zinc-500">Vigência: {c.startsOn ? day(c.startsOn) : "desde o aceite"} {c.endsOn ? `até ${day(c.endsOn)}` : "sem prazo final"}</p>}
                    {c.commercialTerms && <p className="mt-2 text-[13px] whitespace-pre-line text-zinc-700">{c.commercialTerms}</p>}
                    {c.terms && (
                      <details className="mt-3 rounded-md border border-zinc-200 bg-zinc-50">
                        <summary className="cursor-pointer px-3 py-2 text-[13px] font-medium text-zinc-700">Ler o texto completo</summary>
                        <div className="max-h-96 overflow-y-auto border-t border-zinc-200 px-4 py-3 text-[13px] leading-relaxed whitespace-pre-line text-zinc-800">{c.terms}</div>
                      </details>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {c.hasFile && (
                        <a href={`/api/alliance/hub/contracts/${c.id}/file`} className="inline-flex items-center gap-1 text-[13px] text-zinc-700 underline-offset-4 hover:underline" download>
                          <Download className="size-3.5" /> Baixar documento
                        </a>
                      )}
                      {c.status === "sent" && hubCan(user.role, "contracts.accept") && c.termsSha256 && <AcceptContract id={c.id} title={c.title} hash={c.termsSha256} />}
                      {c.status === "sent" && !hubCan(user.role, "contracts.accept") && <span className="text-xs text-zinc-500">Aguardando o aceite do Partner Owner.</span>}
                      {c.acceptedAt && <span className="text-xs text-zinc-500">Aceito por {c.acceptedName} em {formatDateTime(c.acceptedAt)}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>
      )}
    </div>
  );
}
