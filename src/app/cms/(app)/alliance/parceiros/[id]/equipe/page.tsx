import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { HubTeamAdmin } from "@/components/cms/alliance/hub-team";
import { HUB_OPEN_STATUSES, type PartnerStatus } from "@/lib/alliance/constants";
import { requirePermission } from "@/server/authz/guard";
import { getDb, schema } from "@/server/db";
import { isUuid } from "@/server/media/service";
import { listPartnerUsers } from "@/server/alliance/team";

export const metadata: Metadata = { title: "Equipe no Hub · Rocket Alliance" };

export default async function PartnerTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("alliance.view", `/cms/alliance/parceiros/${id}/equipe`);
  if (!isUuid(id)) notFound();
  const [partner] = await getDb().select({ status: schema.partners.status }).from(schema.partners).where(eq(schema.partners.id, id));
  if (!partner) notFound();
  const people = await listPartnerUsers(id);
  return (
    <HubTeamAdmin
      partnerId={id}
      open={HUB_OPEN_STATUSES.includes(partner.status as PartnerStatus)}
      canManage={user.permissions.has("alliance.partners")}
      people={people.map((p) => ({ ...p, lastLoginAt: p.lastLoginAt?.toISOString() ?? null }))}
    />
  );
}
