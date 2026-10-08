import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Plus, UserPlus } from "lucide-react";
import { eq } from "drizzle-orm";
import { ButtonLink } from "@/components/cms/ui/button";
import { Badge, PageHeader } from "@/components/cms/ui/layout";
import { ToneBadge } from "@/components/cms/alliance/tone-badge";
import { Tabs } from "@/components/cms/ui/tabs";
import { siteHref } from "@/lib/cms/site-link";
import { MODALITIES, PARTNER_STATUSES, TIERS, isModalityKey, type TierKey } from "@/lib/alliance/constants";
import type { PartnerSnapshot } from "@/lib/alliance/types";
import { requirePermission } from "@/server/authz/guard";
import { getDb, schema } from "@/server/db";
import { isUuid } from "@/server/media/service";

/**
 * Ficha do parceiro: cabeçalho comum (logo, situação, nível, modalidades e ações rápidas) e as abas.
 * Resumo é o que está acontecendo; Cadastro é onde se edita; Página e Equipe são as outras frentes.
 */
export default async function PartnerLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("alliance.view", `/cms/alliance/parceiros/${id}`);
  if (!isUuid(id)) notFound();
  const db = getDb();
  const [row] = await db
    .select({
      tradeName: schema.partners.tradeName,
      legalName: schema.partners.legalName,
      status: schema.partners.status,
      tierKey: schema.partners.tierKey,
      sector: schema.partners.sector,
      snapshot: schema.partners.publishedSnapshot,
      logoUrl: schema.media.url,
    })
    .from(schema.partners)
    .leftJoin(schema.media, eq(schema.media.id, schema.partners.logoMediaId))
    .where(eq(schema.partners.id, id));
  if (!row) notFound();
  const modalities = await db.select({ key: schema.partnerModalityLinks.modalityKey }).from(schema.partnerModalityLinks).where(eq(schema.partnerModalityLinks.partnerId, id));
  const publicSlug = (row.snapshot as PartnerSnapshot | null)?.slug ?? null;
  const open = row.status === "active" || row.status === "onboarding";
  const can = (p: Parameters<typeof user.permissions.has>[0]) => user.permissions.has(p);

  const base = `/cms/alliance/parceiros/${id}`;
  const tabs = [
    { href: base, label: "Resumo", exact: true },
    { href: `${base}/editar`, label: "Cadastro" },
    ...(can("alliance.publish") ? [{ href: `${base}/pagina`, label: "Página exclusiva" }] : []),
    { href: `${base}/equipe`, label: "Equipe no Hub" },
  ];

  return (
    <div>
      <PageHeader
        back={
          <Link href="/cms/alliance/parceiros" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-3.5" /> Parceiros
          </Link>
        }
        title={row.tradeName}
        leading={
          <span className="flex size-14 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5">
            {row.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-base font-semibold text-zinc-400">{row.tradeName.slice(0, 2).toUpperCase()}</span>
            )}
          </span>
        }
        meta={
          <>
            <ToneBadge list={PARTNER_STATUSES} value={row.status} />
            <Badge>{TIERS[row.tierKey as TierKey]?.name ?? row.tierKey}</Badge>
            {publicSlug ? <Badge tone="green">No diretório</Badge> : <Badge>Fora do diretório</Badge>}
          </>
        }
        description={[modalities.map((m) => (isModalityKey(m.key) ? MODALITIES[m.key].name : m.key)).join(", ") || "Sem modalidade", row.sector, row.legalName].filter(Boolean).join(" · ")}
        actions={
          <>
            {publicSlug && (
              <ButtonLink href={siteHref(`/partners/${publicSlug}`)} target="_blank" rel="noreferrer" variant="ghost" size="sm">
                <ExternalLink className="size-3.5" /> Ver no site
              </ButtonLink>
            )}
            {open && can("alliance.partners") && (
              <ButtonLink href={`${base}/equipe`} variant="secondary" size="sm">
                <UserPlus className="size-3.5" /> Convidar pessoa
              </ButtonLink>
            )}
            {open && can("alliance.referrals") && (
              <ButtonLink href={`/cms/alliance/indicacoes/nova?parceiro=${id}`} size="sm">
                <Plus className="size-3.5" /> Nova indicação
              </ButtonLink>
            )}
          </>
        }
      />
      <Tabs label="Seções do parceiro" items={tabs} />
      {children}
    </div>
  );
}
