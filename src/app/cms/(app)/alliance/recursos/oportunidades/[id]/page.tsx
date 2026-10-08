import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, PageHeader, Panel } from "@/components/cms/ui/layout";
import { InterestDecision, OpportunityEditor } from "@/components/cms/alliance/library-admin";
import { formatDateTime } from "@/lib/cms/format";
import { requirePermission } from "@/server/authz/guard";
import { isUuid } from "@/server/media/service";
import { getOpportunity } from "@/server/alliance/library";
import { partnerOptions } from "@/server/alliance/partners";

export const metadata: Metadata = { title: "Oportunidade · Rocket Alliance" };

const STATUS: Record<string, { label: string; tone: "neutral" | "green" | "red" }> = { pending: { label: "Aguardando", tone: "neutral" }, accepted: { label: "Aceito", tone: "green" }, declined: { label: "Recusado", tone: "red" } };

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("alliance.resources", `/cms/alliance/recursos/oportunidades/${id}`);
  if (!isUuid(id)) notFound();
  const data = await getOpportunity(id);
  if (!data) notFound();
  const o = data.row;
  return (
    <div>
      <PageHeader
        back={
          <Link href="/cms/alliance/recursos/oportunidades" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Oportunidades
          </Link>
        }
        title={o.title}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <Panel>
          <OpportunityEditor
            id={o.id}
            partners={await partnerOptions()}
            initial={{ title: o.title, kind: o.kind, summary: o.summary, description: o.description, status: o.status, deadline: o.deadline, minTierRank: o.minTierRank, modalities: o.modalities, partnerIds: o.partnerIds }}
          />
        </Panel>
        <Panel title="Interessados">
          {data.interests.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma empresa demonstrou interesse ainda.</p>
          ) : (
            <ul className="-my-2 divide-y divide-zinc-100">
              {data.interests.map((i) => (
                <li key={i.id} className="py-3 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/cms/alliance/parceiros/${i.partnerId}`} className="font-medium text-zinc-900 underline-offset-4 hover:underline">
                      {i.partnerName}
                    </Link>
                    <Badge tone={STATUS[i.status]?.tone}>{STATUS[i.status]?.label ?? i.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {i.personName ?? "—"} · {formatDateTime(i.createdAt)}
                  </p>
                  {i.message && <p className="mt-1.5 whitespace-pre-line text-zinc-700">{i.message}</p>}
                  {i.status === "pending" && (
                    <div className="mt-2">
                      <InterestDecision id={i.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
