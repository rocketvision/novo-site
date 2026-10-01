import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { audit, diff } from "@/server/audit";
import { invalidate } from "@/server/cache";
import { conflict, notFound } from "@/server/http/errors";
import { MODALITIES, MODALITY_KEYS, TIERS, TIER_KEYS, type ModalityKey, type TierKey } from "@/lib/alliance/constants";
import {
  DEFAULT_PROGRAM_SETTINGS,
  modalityUpdateSchema,
  programSettingsSchema,
  tierUpdateSchema,
  type ProgramSettings,
} from "@/lib/alliance/validation";
import type { z } from "zod";
import { ALLIANCE_TAGS } from "./tags";

type Actor = { id: string; email: string };
type Ctx = { ip: string | null; userAgent: string | null };

/** Parâmetros operacionais. Conteúdo guardado passa pelo schema: se estiver inválido, valem os padrões. */
export async function getProgramSettings(): Promise<ProgramSettings & { version: number }> {
  const [row] = await getDb().select().from(schema.allianceSettings).where(eq(schema.allianceSettings.key, "program"));
  const parsed = programSettingsSchema.safeParse({ ...DEFAULT_PROGRAM_SETTINGS, ...(row?.data as object | undefined) });
  return { ...(parsed.success ? parsed.data : DEFAULT_PROGRAM_SETTINGS), version: row?.version ?? 0 };
}

export async function updateProgramSettings(actor: Actor, input: ProgramSettings, expectedVersion: number, ctx: Ctx) {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(schema.allianceSettings).where(eq(schema.allianceSettings.key, "program")).for("update");
    if ((row?.version ?? 0) !== expectedVersion) throw conflict("As configurações foram alteradas por outra pessoa. Recarregue a página.", "stale");
    const changes = diff(row?.data ?? null, input);
    const [saved] = row
      ? await tx
          .update(schema.allianceSettings)
          .set({ data: input, version: sql`${schema.allianceSettings.version} + 1`, updatedBy: actor.id, updatedAt: new Date() })
          .where(eq(schema.allianceSettings.key, "program"))
          .returning({ version: schema.allianceSettings.version })
      : await tx.insert(schema.allianceSettings).values({ key: "program", data: input, updatedBy: actor.id }).returning({ version: schema.allianceSettings.version });
    await audit({ actor, action: "alliance.settings.updated", resourceType: "alliance_settings", resourceId: "program", summary: "Alterou os parâmetros do Rocket Alliance", changes, ...ctx }, tx);
    return { version: saved.version };
  });
}

/* -------------------------------------------------------------------------- */
/* Modalidades e níveis                                                        */
/* -------------------------------------------------------------------------- */

export type ModalityRow = { key: ModalityKey; name: string; description: string; isActive: boolean; icon: (typeof MODALITIES)[ModalityKey]["icon"] };
export type TierRow = { key: TierKey; name: string; rank: number; label: string; description: string; benefits: string[] };

/** Modalidades na ordem oficial. Se o banco falhar, os textos aprovados do código. */
export async function listModalities(): Promise<ModalityRow[]> {
  const rows = await getDb().select().from(schema.partnerModalities).orderBy(asc(schema.partnerModalities.sortOrder));
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return MODALITY_KEYS.map((key) => {
    const row = byKey.get(key);
    return { key, name: row?.name ?? MODALITIES[key].name, description: row?.description ?? MODALITIES[key].description, isActive: row?.isActive ?? true, icon: MODALITIES[key].icon };
  });
}

export async function listTiers(): Promise<TierRow[]> {
  const rows = await getDb().select().from(schema.partnerTiers).orderBy(asc(schema.partnerTiers.rank));
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return TIER_KEYS.map((key) => {
    const row = byKey.get(key);
    const base = TIERS[key];
    return { key, name: row?.name ?? base.name, rank: row?.rank ?? base.rank, label: row?.label ?? base.label, description: row?.description ?? base.description, benefits: row?.benefits ?? base.benefits };
  });
}

export async function updateModality(actor: Actor, key: string, input: z.infer<typeof modalityUpdateSchema>, ctx: Ctx) {
  const db = getDb();
  const [before] = await db.select().from(schema.partnerModalities).where(eq(schema.partnerModalities.key, key));
  if (!before) throw notFound("Modalidade não encontrada.");
  await db.update(schema.partnerModalities).set({ ...input, updatedAt: new Date() }).where(eq(schema.partnerModalities.key, key));
  await audit({ actor, action: "alliance.modality.updated", resourceType: "partner_modality", resourceId: key, summary: `Alterou a modalidade ${input.name}`, changes: diff({ name: before.name, description: before.description, isActive: before.isActive }, input), ...ctx });
  invalidate(ALLIANCE_TAGS.program, ALLIANCE_TAGS.directory);
}

export async function updateTier(actor: Actor, key: string, input: z.infer<typeof tierUpdateSchema>, ctx: Ctx) {
  const db = getDb();
  const [before] = await db.select().from(schema.partnerTiers).where(eq(schema.partnerTiers.key, key));
  if (!before) throw notFound("Nível não encontrado.");
  await db.update(schema.partnerTiers).set({ ...input, updatedAt: new Date() }).where(eq(schema.partnerTiers.key, key));
  await audit({ actor, action: "alliance.tier.updated", resourceType: "partner_tier", resourceId: key, summary: `Alterou o nível ${input.name}`, changes: diff({ name: before.name, label: before.label, description: before.description, benefits: before.benefits }, input), ...ctx });
  invalidate(ALLIANCE_TAGS.program, ALLIANCE_TAGS.directory);
}
