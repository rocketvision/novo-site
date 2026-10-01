import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Plus } from "lucide-react";
import { Badge, Panel } from "@/components/cms/ui/layout";
import { TierBadge } from "@/components/alliance/tier-badge";
import { relativeTime } from "@/lib/cms/format";
import { hubCan, isModalityKey, MODALITIES, PROGRAM, TIERS, type TierKey } from "@/lib/alliance/constants";
import { formatMoney } from "@/lib/alliance/money";
import { requireHubSession } from "@/server/alliance/hub/guard";
import { countReferralsForHub } from "@/server/alliance/referrals";
import { hubAnnouncements, hubAudienceOf, hubNotifications } from "@/server/alliance/library";
import { hubEarnings } from "@/server/alliance/commissions";
import { hubContracts } from "@/server/alliance/contracts";
import { isTwoFactorAvailable } from "@/server/alliance/hub/totp";

export const metadata: Metadata = { title: "Painel" };

/** Dashboard do parceiro: quem é no programa, números da empresa, próximos passos e comunicados. */
export default async function HubDashboard() {
  const { user } = await requireHubSession();
  const who = await hubAudienceOf(user);
  const canEarnings = hubCan(user.role, "earnings.view");
  const [counts, announcements, notifications, earnings, contracts] = await Promise.all([
    countReferralsForHub(user),
    hubAnnouncements(user),
    hubNotifications(user, 6),
    canEarnings ? hubEarnings(user.partner.id, user.partner.tierKey, who.modalities) : Promise.resolve(null),
    hubContracts(user),
  ]);
  const open = (counts.submitted ?? 0) + (counts.under_review ?? 0) + (counts.qualified ?? 0) + (counts.in_negotiation ?? 0);
  const tier = TIERS[user.partner.tierKey as TierKey];

  const steps = [
    { done: contracts.every((c) => c.status !== "sent"), text: "Ler e aceitar o termo de parceria", href: "/alliance/empresa#contratos", show: hubCan(user.role, "contracts.view") && contracts.length > 0 },
    { done: user.totpEnabled, text: "Ativar a verificação em duas etapas", href: "/alliance/conta#seguranca", show: isTwoFactorAvailable() },
    { done: (Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)) > 0, text: "Registrar a primeira indicação", href: "/alliance/indicacoes/nova", show: true },
    { done: false, text: "Conhecer os materiais comerciais", href: "/alliance/recursos", show: true },
  ].filter((s) => s.show);
  const pending = steps.filter((s) => !s.done);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-[#0a0a0c] px-6 py-8 text-white sm:px-10 sm:py-10">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(50%_80%_at_100%_0%,rgb(44_157_245/0.22),transparent_70%)]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-white/50 uppercase">{PROGRAM.name}</p>
            <h1 className="mt-3 text-[1.9rem] leading-tight font-semibold tracking-[-0.03em]">Olá, {user.name.split(" ")[0]}.</h1>
            <p className="mt-1 text-[15px] text-white/65">{user.partner.tradeName}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] py-1 pr-3.5 pl-1 text-[12px] font-medium text-white ring-1 ring-white/15">
                <TierBadge tier={user.partner.tierKey} size={30} />
                {tier?.name ?? user.partner.tierKey}
              </span>
              {who.modalities.map((m) => (
                <span key={m} className="rounded-full px-3 py-1 text-[12px] text-white/75 ring-1 ring-white/15">
                  {isModalityKey(m) ? MODALITIES[m].name : m}
                </span>
              ))}
              {user.partner.status === "onboarding" && <span className="rounded-full px-3 py-1 text-[12px] text-amber-200 ring-1 ring-amber-300/30">Onboarding</span>}
            </div>
          </div>
          <div className="flex flex-col items-start gap-5 sm:items-end">
            <TierBadge tier={user.partner.tierKey} size={112} detailed title={`Selo ${tier?.name ?? user.partner.tierKey}`} className="hidden drop-shadow-[0_16px_32px_rgb(0_0_0/0.5)] sm:block" />
            {hubCan(user.role, "referrals.create") && (
              <Link href="/alliance/indicacoes/nova" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-100">
                <Plus className="size-4" /> Nova indicação
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Indicações ativas" value={String(open)} href="/alliance/indicacoes" />
        <Stat label="Contratos fechados" value={String(counts.won ?? 0)} href="/alliance/indicacoes?status=won" />
        {earnings ? (
          <>
            <Stat label="Comissões aprovadas" value={formatMoney(earnings.approvedCents)} hint={earnings.pendingCents ? `${formatMoney(earnings.pendingCents)} em análise` : undefined} href="/alliance/ganhos" />
            <Stat label="Pagamentos realizados" value={formatMoney(earnings.paidCents)} href="/alliance/ganhos#pagamentos" />
          </>
        ) : (
          <>
            <Stat label="Em negociação" value={String(counts.in_negotiation ?? 0)} />
            <Stat label="Qualificadas" value={String(counts.qualified ?? 0)} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Panel title="Próximos passos">
            {pending.length === 0 ? (
              <p className="text-[13px] text-zinc-500">Tudo em dia. Bons negócios!</p>
            ) : (
              <ul className="-my-1 space-y-1">
                {steps.map((s) => (
                  <li key={s.text}>
                    <Link href={s.href} className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-zinc-50">
                      <span className={s.done ? "flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white" : "size-5 rounded-full border border-zinc-300"}>{s.done && <Check className="size-3" />}</span>
                      <span className={s.done ? "flex-1 text-[13px] text-zinc-400 line-through" : "flex-1 text-[13px] text-zinc-800"}>{s.text}</span>
                      {!s.done && <ArrowRight className="size-4 text-zinc-300 group-hover:text-zinc-600" />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Comunicados" actions={announcements.length > 0 && <Link href="/alliance/avisos" className="text-[13px] text-zinc-600 hover:text-zinc-900">Ver todos</Link>}>
            {announcements.length === 0 ? (
              <p className="text-[13px] text-zinc-500">Nenhum comunicado por enquanto.</p>
            ) : (
              <ul className="-my-2 divide-y divide-zinc-100">
                {announcements.slice(0, 3).map((a) => (
                  <li key={a.id} className="py-3">
                    <p className="flex items-center gap-2 text-[13px] font-medium text-zinc-900">
                      {a.title} {a.important && <Badge tone="amber">Importante</Badge>}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[13px] text-zinc-600">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <Panel title="Atividade recente" className="lg:col-span-2">
          {notifications.length === 0 ? (
            <p className="text-[13px] text-zinc-500">As novidades das suas indicações, comissões e pagamentos aparecem aqui.</p>
          ) : (
            <ol className="-my-1 space-y-3">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link href={n.link ?? "/alliance/avisos"} className="block text-[13px] hover:underline">
                    <span className={n.readAt ? "text-zinc-700" : "font-medium text-zinc-900"}>{n.title}</span>
                  </Link>
                  <p className="text-xs text-zinc-500">{relativeTime(n.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
          {earnings && earnings.forecastCents > 0 && (
            <div className="mt-6 rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-200">
              <p className="text-xs text-zinc-500">Comissões previstas</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(earnings.forecastCents)}</p>
              <p className="mt-1 text-xs text-zinc-500">Estimativa sobre contratos fechados ainda não recebidos. Não é pagamento garantido.</p>
            </div>
          )}
        </Panel>
      </div>
      <p className="text-center font-serif text-[15px] text-zinc-400 italic">{PROGRAM.slogan}</p>
    </div>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-[13px] text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="bg-white px-5 py-4 hover:bg-zinc-50">
      {body}
    </Link>
  ) : (
    <div className="bg-white px-5 py-4">{body}</div>
  );
}
