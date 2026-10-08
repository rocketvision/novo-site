import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { ContractActions, ContractEditor } from "@/components/cms/alliance/library-admin";
import { formatDateTime } from "@/lib/cms/format";
import { CONTRACT_KINDS, CONTRACT_STATUSES } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { isUuid } from "@/server/media/service";
import { getContract } from "@/server/alliance/contracts";
import { partnerOptions } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Contrato · Rocket Alliance" };

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("alliance.contracts", `/cms/alliance/contratos/${id}`);
  if (!isUuid(id)) notFound();
  const data = await getContract(id);
  if (!data) notFound();
  const c = data.contract;
  const partners = await partnerOptions();
  const day = (d: string | null) => (d ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)) : null);

  return (
    <div>
      <PageHeader
        back={
          <Link href="/cms/alliance/contratos" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Contratos
          </Link>
        }
        title={`${c.title} · v${c.version}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <ToneBadge list={CONTRACT_STATUSES} value={c.status} />
            <Link href={`/cms/alliance/parceiros/${c.partnerId}`} className="underline-offset-4 hover:underline">
              {data.partnerName}
            </Link>
            · {CONTRACT_KINDS.find((k) => k.key === c.kind)?.label}
          </span>
        }
        actions={<ContractActions id={c.id} status={c.status} />}
      />
      {c.status === "draft" ? (
        <Panel>
          <ContractEditor
            id={c.id}
            partners={partners}
            initial={{ partnerId: c.partnerId, title: c.title, kind: c.kind, startsOn: c.startsOn, endsOn: c.endsOn, terms: c.terms, commercialTerms: c.commercialTerms, file: c.fileId && data.filename ? { id: c.fileId, filename: data.filename } : null }}
          />
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <Panel title="Texto enviado">
            {c.terms ? <pre className="max-h-[36rem] overflow-y-auto font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-800">{c.terms}</pre> : <p className="text-sm text-zinc-500">Sem texto: o termo é o documento anexo.</p>}
            {c.fileId && (
              <a href={`/api/cms/alliance/contracts/${c.id}/file`} className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-zinc-900 underline-offset-4 hover:underline">
                <Download className="size-4" aria-hidden="true" /> {data.filename ?? "Documento anexo"}
              </a>
            )}
          </Panel>
          <div className="space-y-6">
            <Panel title="Registro">
              <dl className="space-y-3 text-[13px]">
                {c.startsOn && <Row label="Vigência" value={`${day(c.startsOn)}${c.endsOn ? ` a ${day(c.endsOn)}` : ""}`} />}
                {c.sentAt && <Row label="Enviado" value={formatDateTime(c.sentAt)} />}
                {c.acceptedAt && <Row label="Aceito" value={`${formatDateTime(c.acceptedAt)} por ${data.acceptedByName ?? c.acceptedName}`} />}
                {c.acceptedIp && <Row label="IP do aceite" value={c.acceptedIp} />}
                {c.acceptedUserAgent && <Row label="Navegador" value={<span className="break-all">{c.acceptedUserAgent}</span>} />}
                {c.termsSha256 && <Row label="SHA-256 do texto" value={<code className="font-mono text-[11px] break-all">{c.termsSha256}</code>} />}
              </dl>
            </Panel>
            {c.commercialTerms && (
              <Panel title="Condições comerciais">
                <p className="text-[13px] whitespace-pre-line text-zinc-700">{c.commercialTerms}</p>
              </Panel>
            )}
            <Link href={`/cms/alliance/contratos/novo?parceiro=${c.partnerId}`} className="block text-[13px] text-zinc-600 underline-offset-4 hover:underline">
              Criar nova versão para este parceiro
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-900">{value}</dd>
    </div>
  );
}
