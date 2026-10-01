import { HubShell, type HubNavKey } from "@/components/hub/hub-shell";
import { hubCan, partnerRoleLabel } from "@/lib/alliance/constants";
import { requireHubSession } from "@/server/alliance/hub/guard";
import { unreadCount } from "@/server/alliance/library";

/** Layout autenticado do Hub. Toda página abaixo exige sessão válida do Hub (verificada no servidor). */
export default async function HubAppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireHubSession();
  const opts = { managersInvite: user.partner.managersInvite };
  const gates: [HubNavKey, boolean][] = [
    ["dashboard", true],
    ["referrals", true],
    ["earnings", hubCan(user.role, "earnings.view")],
    ["resources", true],
    ["opportunities", true],
    ["support", hubCan(user.role, "support.use")],
    ["company", hubCan(user.role, "company.edit") || hubCan(user.role, "contracts.view")],
    ["team", hubCan(user.role, "team.view") || hubCan(user.role, "team.manage", opts)],
  ];
  return (
    <HubShell allowed={gates.filter(([, ok]) => ok).map(([k]) => k)} user={{ name: user.name, company: user.partner.tradeName, role: partnerRoleLabel(user.role) }} unread={await unreadCount(user)}>
      {children}
    </HubShell>
  );
}
