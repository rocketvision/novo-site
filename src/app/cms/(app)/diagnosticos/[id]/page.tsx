import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Panel } from "@/components/cms/ui/layout";
import { DiagnosticManager } from "@/components/cms/diagnostics/diagnostic-manager";
import { StatusBadge } from "@/components/cms/diagnostics/status-badge";
import { formatDateTime, relativeTime } from "@/lib/cms/format";
import { maskPhone, STATUS_KEYS, type DiagnosticStatus } from "@/lib/diagnostic";
import { requirePermission } from "@/server/authz/guard";
import { getDiagnostic } from "@/server/diagnostics/service";
import { bookingsForDiagnostic } from "@/server/calendar/bookings";
import { CONTACT_PREFERENCES, formatDay, localDate, localTime } from "@/lib/booking";
import { Video } from "lucide-react";

export const metadata: Metadata = { title: "Diagnóstico" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Um diagnóstico completo: as respostas à esquerda e o atendimento à direita. */
export default async function DiagnosticPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("diagnostics.view", `/cms/diagnosticos/${id}`);
  if (!UUID.test(id)) notFound();
  const [row, calls] = await Promise.all([getDiagnostic(id), bookingsForDiagnostic(id)]);
  if (!row) notFound();
  const call = calls.find((c) => c.status === "confirmado");
  const d = row.diagnostic;
  const first = d.name.split(/\s+/)[0];
  const message = `Olá, ${first}! Aqui é da Rocket Vision. Recebemos o diagnóstico da ${d.business} e queremos marcar a call de 15 minutos pra te mostrar o plano. Qual horário fica bom pra você?`;
  const whatsappHref = `https://wa.me/55${d.whatsapp}?text=${encodeURIComponent(message)}`;
  const status = (STATUS_KEYS as readonly string[]).includes(d.status) ? (d.status as DiagnosticStatus) : "novo";

  const answers: [string, React.ReactNode][] = [
    ["WhatsApp", <span key="w" className="tabular-nums">{maskPhone(d.whatsapp)}</span>],
    ["O que o negócio faz", d.segment],
    ["Hoje na internet", d.presence],
    [
      "Problemas que enxerga",
      <ul key="p" className="flex flex-wrap gap-1.5">
        {d.problems.map((p) => (
          <li key={p} className="rounded bg-zinc-100 px-2 py-0.5 text-[13px] text-zinc-700">
            {p}
          </li>
        ))}
      </ul>,
    ],
    ["Prazo", d.timing],
    ["Como quer seguir", d.contactPreference ? CONTACT_PREFERENCES[d.contactPreference] ?? d.contactPreference : "Não escolheu (fechou o quiz)"],
    ["Aberto em", !d.source ? "não informado" : d.source === "/" ? "Página inicial" : d.source],
  ];

  return (
    <div className="max-w-5xl">
      <PageHeader
        back={
          <Link href="/cms/diagnosticos" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Diagnósticos
          </Link>
        }
        title={d.business}
        description={
          <>
            {d.name} · recebido {relativeTime(d.createdAt)} ({formatDateTime(d.createdAt)})
          </>
        }
        actions={<StatusBadge status={d.status} className="text-sm" />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel title="Respostas">
          <dl className="divide-y divide-zinc-100">
            {answers.map(([label, value]) => (
              <div key={label} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
                <dt className="text-sm text-zinc-500">{label}</dt>
                <dd className="text-sm text-zinc-900">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Atendimento">
          {call && (
            <div className="mb-5 rounded-md bg-sky-50 p-3 ring-1 ring-sky-200">
              <p className="text-xs text-sky-800">Call agendada</p>
              <p className="mt-0.5 text-sm font-medium text-sky-950 first-letter:uppercase">
                {formatDay(localDate(call.startsAt))} · {localTime(call.startsAt)}
              </p>
              {call.meetUrl && (
                <a href={call.meetUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-900">
                  <Video className="size-3.5" aria-hidden="true" />
                  Entrar no Meet
                </a>
              )}
            </div>
          )}
          <DiagnosticManager
            id={d.id}
            status={status}
            notes={d.notes}
            whatsappHref={whatsappHref}
            canManage={user.permissions.has("diagnostics.manage")}
            canDelete={user.permissions.has("diagnostics.delete")}
          />
          <p className="mt-6 text-xs text-zinc-400">
            Atualizado {relativeTime(d.updatedAt)}
            {row.updatedByName && <> por {row.updatedByName}</>}.
          </p>
        </Panel>
      </div>
    </div>
  );
}
