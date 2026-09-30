import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import type { PartnerRole } from "@/lib/alliance/constants";
import { deliver, type TemplateKey } from "./mail";

/**
 * Avisos para as pessoas de uma empresa parceira: um item na caixa de avisos do Hub para cada
 * pessoa ativa (filtrada por papel, se preciso) e, opcionalmente, o mesmo aviso por e-mail.
 * Chamado depois de a alteração ser gravada: um aviso nunca sai de uma operação desfeita.
 */
export async function notifyPartner(
  partnerId: string,
  notice: { type: string; title: string; body?: string; link?: string | null },
  options: {
    roles?: PartnerRole[];
    userIds?: string[];
    email?: { template: TemplateKey; params: Record<string, string>; dedupeKey: string };
  } = {},
) {
  const db = getDb();
  const where = [eq(schema.partnerUsers.partnerId, partnerId), eq(schema.partnerUsers.status, "active")];
  if (options.roles?.length) where.push(inArray(schema.partnerUsers.role, options.roles));
  if (options.userIds?.length) where.push(inArray(schema.partnerUsers.id, options.userIds));
  const people = await db.select({ id: schema.partnerUsers.id, name: schema.partnerUsers.name, email: schema.partnerUsers.email }).from(schema.partnerUsers).where(and(...where));
  if (people.length === 0) return 0;

  await db.insert(schema.partnerNotifications).values(
    people.map((p) => ({ partnerId, partnerUserId: p.id, type: notice.type, title: notice.title, body: notice.body ?? "", link: notice.link ?? null })),
  );

  const email = options.email;
  if (email) {
    await Promise.all(
      people.map((p) => deliver({ dedupeKey: `${email.dedupeKey}:${p.id}`, template: email.template, to: p.email, partnerId, params: { ...email.params, name: p.name } })),
    );
  }
  return people.length;
}
