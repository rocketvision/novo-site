import "server-only";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { audit } from "@/server/audit";
import { conflict, forbidden, notFound } from "@/server/http/errors";
import { hubCan, partnerRoleLabel, type PartnerRole } from "@/lib/alliance/constants";
import type { HubUser } from "./hub/session";

type Ctx = { ip: string | null; userAgent: string | null };
type CmsActor = { id: string; email: string };

/** Pessoas de uma empresa parceira com acesso ao Hub. Sempre filtrado pela empresa. */
export async function listPartnerUsers(partnerId: string) {
  return getDb()
    .select({
      id: schema.partnerUsers.id,
      name: schema.partnerUsers.name,
      email: schema.partnerUsers.email,
      role: schema.partnerUsers.role,
      status: schema.partnerUsers.status,
      totpEnabled: sql<boolean>`${schema.partnerUsers.totpEnabledAt} IS NOT NULL`,
      lastLoginAt: schema.partnerUsers.lastLoginAt,
      createdAt: schema.partnerUsers.createdAt,
    })
    .from(schema.partnerUsers)
    .where(eq(schema.partnerUsers.partnerId, partnerId))
    .orderBy(sql`case ${schema.partnerUsers.role} when 'owner' then 0 when 'manager' then 1 else 2 end`, asc(schema.partnerUsers.name));
}

/**
 * Muda o papel ou desativa/reativa alguém da equipe.
 * - A empresa sempre mantém ao menos um Responsável ativo.
 * - Ninguém muda o próprio papel nem desativa a si mesmo.
 * - Pelo Hub, só o Responsável gerencia a equipe e não cria outro owner (isso é com a Rocket).
 */
export async function updatePartnerUser(
  by: { kind: "cms"; actor: CmsActor } | { kind: "hub"; user: HubUser },
  partnerId: string,
  userId: string,
  input: { role?: PartnerRole; status?: "active" | "disabled" },
  ctx: Ctx,
) {
  if (by.kind === "hub") {
    if (by.user.partner.id !== partnerId || !hubCan(by.user.role, "team.manage")) throw forbidden();
    if (by.user.role !== "owner") throw forbidden("Só o Responsável muda papéis e acessos.");
    if (by.user.id === userId) throw forbidden("Você não pode mudar o próprio acesso.");
    if (input.role === "owner") throw forbidden("O Responsável é definido pela Rocket Vision.");
  }
  await getDb().transaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(schema.partnerUsers)
      .where(and(eq(schema.partnerUsers.id, userId), eq(schema.partnerUsers.partnerId, partnerId)))
      .for("update");
    // Outra empresa ou inexistente: a mesma resposta (não confirma que o ID existe).
    if (!target) throw notFound("Pessoa não encontrada.");
    if (by.kind === "hub" && target.role === "owner") throw forbidden("O Responsável é gerenciado pela Rocket Vision.");

    const losingOwner = target.role === "owner" && target.status === "active" && ((input.role && input.role !== "owner") || input.status === "disabled");
    if (losingOwner) {
      const [{ owners }] = await tx
        .select({ owners: sql<number>`count(*)::int` })
        .from(schema.partnerUsers)
        .where(and(eq(schema.partnerUsers.partnerId, partnerId), eq(schema.partnerUsers.role, "owner"), eq(schema.partnerUsers.status, "active"), ne(schema.partnerUsers.id, userId)));
      if (owners === 0) throw conflict("A empresa precisa de ao menos um Responsável ativo. Defina outro antes.", "last_owner");
    }
    if (input.status === "active" && !target.passwordHash) throw conflict("Esta pessoa ainda não aceitou o convite. Reenvie o convite.", "not_accepted");

    await tx
      .update(schema.partnerUsers)
      .set({ ...(input.role && { role: input.role }), ...(input.status && { status: input.status }), updatedAt: new Date(), version: sql`${schema.partnerUsers.version} + 1` })
      .where(eq(schema.partnerUsers.id, userId));
    if (input.status === "disabled") await tx.delete(schema.partnerSessions).where(eq(schema.partnerSessions.partnerUserId, userId));

    const parts = [input.role && input.role !== target.role && `papel ${partnerRoleLabel(target.role)} → ${partnerRoleLabel(input.role)}`, input.status && input.status !== target.status && (input.status === "disabled" ? "acesso desativado" : "acesso reativado")].filter(Boolean);
    await audit(
      {
        actor: by.kind === "cms" ? by.actor : { id: null, email: by.user.email },
        action: by.kind === "cms" ? "alliance.hub_user.updated" : "alliance.hub.team_updated",
        resourceType: "partner_user",
        resourceId: userId,
        summary: `${target.email}: ${parts.join(", ") || "sem mudanças"}`,
        changes: {
          ...(input.role && input.role !== target.role && { role: { before: target.role, after: input.role } }),
          ...(input.status && input.status !== target.status && { status: { before: target.status, after: input.status } }),
        },
        ...ctx,
      },
      tx,
    );
  });
}
