import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { PageHeader } from "@/components/cms/ui/layout";
import { HubTeam } from "@/components/hub/team-admin";
import { hubCan } from "@/lib/alliance/constants";
import { requireHubSession } from "@/server/alliance/hub/guard";
import { listPartnerUsers } from "@/server/alliance/team";

export const metadata: Metadata = { title: "Equipe" };

export default async function HubTeamPage() {
  const { user } = await requireHubSession();
  const canInvite = hubCan(user.role, "team.manage", { managersInvite: user.partner.managersInvite });
  if (!hubCan(user.role, "team.view") && !canInvite) forbidden();
  const people = await listPartnerUsers(user.partner.id);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Equipe" description={`Quem da ${user.partner.tradeName} acessa o Alliance Hub.`} />
      <HubTeam people={people.map((p) => ({ ...p, lastLoginAt: p.lastLoginAt?.toISOString() ?? null }))} me={user.id} isOwner={user.role === "owner"} canInvite={canInvite} />
    </div>
  );
}
