import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { ApplicationDecision } from "@/components/cms/alliance/application-decision";
import { formatDateTime } from "@/lib/cms/format";
import { maskPhone } from "@/lib/diagnostic";
import { APPLICATION_STATUSES, MODALITIES, type ModalityKey } from "@/lib/alliance/constants";
import { slugify } from "@/lib/validation/projects";
import { requirePermission } from "@/server/authz/guard";
import { isUuid } from "@/server/media/service";
import { getApplication } from "@/server/alliance/applications";

export const metadata: Metadata = { title: "Candidatura · Rocket Alliance" };

const EVENT_LABELS: Record<string, string> = {
  submitted: "Candidatura enviada pelo site",
  approved: "Aprovada",
  rejected: "Recusada",
  info_requested: "Pedido de informações enviado",
  note: "Anotação interna",
};

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("alliance.applications", `/cms/alliance/candidaturas/${id}`);
  if (!isUuid(id)) notFound();
  const data = await getApplication(id);
  if (!data) notFound();
  const { row: a, events, partner } = data;
  const open = a.status === "pending_review" || a.status === "info_requested";

  return (
    <div className="max-w-5xl">
      <PageHeader
        back={
          <Link href="/cms/alliance/candidaturas" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Candidaturas
          </Link>
        }
        title={a.company}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <ToneBadge list={APPLICATION_STATUSES} value={a.status} />
            <span>Recebida em {formatDateTime(a.createdAt)}</span>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Candidatura">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Item label="Nome" value={a.name} />
              <Item label="E-mail" value={<a className="text-zinc-900 underline-offset-4 hover:underline" href={`mailto:${a.email}`}>{a.email}</a>} />
              <Item label="Telefone" value={maskPhone(a.phone)} />
              <Item
                label="Site"
                value={
                  a.website ? (
                    <a className="inline-flex items-center gap-1 text-zinc-900 underline-offset-4 hover:underline" href={a.website} target="_blank" rel="noopener noreferrer">
                      {a.website.replace(/^https:\/\//, "")} <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    "Não informado"
                  )
                }
              />
              <Item label="Área de atuação" value={a.sector} />
              <Item label="Modalidade desejada" value={MODALITIES[a.modalityKey as ModalityKey]?.name ?? a.modalityKey} />
            </dl>
            <div className="mt-6 space-y-5 border-t border-zinc-100 pt-5 text-sm">
              <Block label="Sobre a empresa" text={a.companyDescription} />
              <Block label="Interesse na parceria" text={a.interest} />
            </div>
            <p className="mt-6 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
              Consentimento para tratamento dos dados em {formatDateTime(a.consentAt)}. {a.consentMarketing ? "Aceitou receber comunicações do programa." : "Não aceitou receber comunicações do programa."}
            </p>
          </Panel>

          <Panel title="Histórico">
            <ol className="space-y-4">
              {events.map((e) => (
                <li key={e.id} className="text-[13px]">
                  <p className="font-medium text-zinc-900">{EVENT_LABELS[e.action] ?? e.action}</p>
                  {e.message && <p className="mt-1 whitespace-pre-line text-zinc-700">{e.message}</p>}
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {e.actorName ?? "Site"} · {formatDateTime(e.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <aside className="space-y-6">
          {partner && (
            <Panel title="Parceiro criado">
              <p className="text-sm text-zinc-600">A candidatura virou o cadastro de parceiro. Próximos passos: contrato, perfil público e convite para o Alliance Hub.</p>
              <Link href={`/cms/alliance/parceiros/${partner.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-zinc-900 underline-offset-4 hover:underline">
                Abrir {partner.tradeName} <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Panel>
          )}
          <ApplicationDecision
            id={a.id}
            open={open}
            suggestedSlug={slugify(a.company)}
            modality={a.modalityKey}
          />
        </aside>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-900">{value}</dd>
    </div>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-zinc-800">{text}</p>
    </div>
  );
}
