import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, gte, ne } from "drizzle-orm";
import { formatDay, localTime, slotEnd, SLOT_TIMES, localDate, slotStart } from "@/lib/booking";
import { maskPhone, summarize } from "@/lib/diagnostic";
import { audit } from "@/server/audit";
import { getDb } from "@/server/db";
import { availabilityBlocks, bookings, diagnostics, googleCalendarConnection } from "@/server/db/schema";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { log } from "@/server/log";
import { createMeetEvent, deleteEvent, encrypt, getConnection, revoke } from "./google";
import { bookingRange, clearSlotsCache, isSlotFree } from "./availability";

type Actor = { id: string; email: string };
type Meta = { ip?: string | null; userAgent?: string | null };

/** Validade do token de agendamento, a partir do envio do diagnóstico. */
const TOKEN_DAYS = 7;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Confere o token devolvido a quem enviou o diagnóstico (comparação em tempo constante). */
async function diagnosticFor(diagnosticId: string, token: string) {
  const [d] = await getDb().select().from(diagnostics).where(eq(diagnostics.id, diagnosticId)).limit(1);
  if (!d?.bookingTokenHash) throw notFound("Diagnóstico não encontrado.");
  const a = Buffer.from(d.bookingTokenHash, "hex");
  const b = Buffer.from(hashToken(token), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw notFound("Diagnóstico não encontrado.");
  // O token vale por TOKEN_DAYS: um link vazado não serve para agendar para sempre.
  if (Date.now() - d.createdAt.getTime() > TOKEN_DAYS * 24 * 3600_000) throw notFound("Diagnóstico não encontrado.");
  return d;
}

/**
 * Agenda a call de um diagnóstico: reserva o horário no banco (o índice único impede dois no mesmo
 * horário), confere de novo a agenda do Google, cria o evento com Meet e confirma. Se o Google falhar,
 * a reserva é desfeita e o horário volta a ficar livre.
 */
export async function bookCall(input: { diagnosticId: string; token: string; start: Date; email?: string }) {
  const d = await diagnosticFor(input.diagnosticId, input.token);
  const db = getDb();
  if (!SLOT_TIMES.includes(localTime(input.start)) || slotStart(localDate(input.start), localTime(input.start)).getTime() !== input.start.getTime()) {
    throw badRequest("Horário inválido.");
  }
  if (localDate(input.start) > bookingRange().last) throw badRequest("Essa data ainda não está aberta para agendamento.");
  const existing = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.diagnosticId, d.id), ne(bookings.status, "cancelado")))
    .limit(1);
  if (existing.length) throw conflict("Essa call já está agendada.", "already_booked");

  if (!(await isSlotFree(input.start))) throw conflict("Esse horário acabou de ser ocupado. Escolha outro.", "slot_taken");

  const end = slotEnd(input.start);
  let reserved: typeof bookings.$inferSelect;
  try {
    [reserved] = await db
      .insert(bookings)
      .values({ diagnosticId: d.id, name: d.name, business: d.business, whatsapp: d.whatsapp, email: input.email || null, startsAt: input.start, endsAt: end })
      .returning();
  } catch {
    throw conflict("Esse horário acabou de ser ocupado. Escolha outro.", "slot_taken");
  }

  try {
    const event = await createMeetEvent({
      start: input.start,
      end,
      summary: `Diagnóstico · ${d.business} (${d.name})`,
      description: [
        `Call de diagnóstico agendada pelo site da Rocket Vision.`,
        ``,
        `Nome: ${d.name}`,
        `Negócio: ${d.business}`,
        `WhatsApp: ${maskPhone(d.whatsapp)} (https://wa.me/55${d.whatsapp})`,
        input.email ? `E-mail: ${input.email}` : "",
        ``,
        summarize({ ...d, problems: d.problems }),
      ]
        .filter((l) => l !== "")
        .join("\n"),
      attendeeEmail: input.email || undefined,
    });
    const [confirmed] = await db
      .update(bookings)
      .set({ status: "confirmado", googleEventId: event.id, meetUrl: event.meetUrl, eventUrl: event.eventUrl })
      .where(eq(bookings.id, reserved.id))
      .returning();
    await db.update(diagnostics).set({ contactPreference: "agendou", status: d.status === "novo" ? "call_agendada" : d.status, updatedAt: new Date() }).where(eq(diagnostics.id, d.id));
    clearSlotsCache();
    return confirmed;
  } catch (error) {
    await db.delete(bookings).where(eq(bookings.id, reserved.id));
    log.error("booking.google_failed", { error });
    throw error;
  }
}

/** "Chamar no WhatsApp" ou "Aguardar vocês me chamarem": fica anotado no diagnóstico. */
export async function setContactPreference(diagnosticId: string, token: string, preference: "whatsapp" | "aguardar") {
  const d = await diagnosticFor(diagnosticId, token);
  if (d.contactPreference === "agendou") return;
  await getDb().update(diagnostics).set({ contactPreference: preference }).where(eq(diagnostics.id, d.id));
}

/* ----------------------------------- CMS ---------------------------------- */

export async function upcomingBookings(now = new Date()) {
  return getDb()
    .select()
    .from(bookings)
    .where(and(gte(bookings.endsAt, now), eq(bookings.status, "confirmado")))
    .orderBy(asc(bookings.startsAt));
}

export async function bookingsForDiagnostic(diagnosticId: string) {
  return getDb().select().from(bookings).where(eq(bookings.diagnosticId, diagnosticId)).orderBy(desc(bookings.createdAt));
}

export async function cancelBooking(actor: Actor, id: string, meta: Meta = {}) {
  const db = getDb();
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!booking || booking.status === "cancelado") throw notFound("Call não encontrada.");
  if (booking.googleEventId) await deleteEvent(booking.googleEventId);
  await db.transaction(async (tx) => {
    await tx.update(bookings).set({ status: "cancelado", cancelledAt: new Date(), cancelledBy: actor.id }).where(eq(bookings.id, id));
    clearSlotsCache();
    await audit(
      {
        actor,
        action: "booking.cancel",
        resourceType: "diagnostic",
        resourceId: booking.diagnosticId,
        summary: `Call de ${booking.business} cancelada (${formatDay(localDate(booking.startsAt))}, ${localTime(booking.startsAt)})`,
        ...meta,
      },
      tx,
    );
  });
}

/** Bloqueia um horário (from–to) ou o dia inteiro de uma data. */
export async function createBlock(actor: Actor, input: { date: string; from?: string; to?: string; reason?: string }, meta: Meta = {}) {
  const startsAt = slotStart(input.date, input.from ?? "00:00");
  const endsAt = input.to ? slotStart(input.date, input.to) : new Date(slotStart(input.date, "00:00").getTime() + 24 * 3600_000);
  const [block] = await getDb().transaction(async (tx) => {
    const rows = await tx.insert(availabilityBlocks).values({ startsAt, endsAt, reason: input.reason ?? "", createdBy: actor.id }).returning();
    await audit(
      {
        actor,
        action: "availability.block",
        resourceType: "availability",
        resourceId: rows[0].id,
        summary: `${formatDay(input.date)}${input.from ? `, ${input.from}–${input.to}` : " (dia inteiro)"} bloqueado${input.reason ? `: ${input.reason}` : ""}`,
        ...meta,
      },
      tx,
    );
    return rows;
  });
  clearSlotsCache();
  return block;
}

export async function deleteBlock(actor: Actor, id: string, meta: Meta = {}) {
  clearSlotsCache();
  await getDb().transaction(async (tx) => {
    const [removed] = await tx.delete(availabilityBlocks).where(eq(availabilityBlocks.id, id)).returning();
    if (!removed) throw notFound("Bloqueio não encontrado.");
    await audit(
      { actor, action: "availability.unblock", resourceType: "availability", resourceId: id, summary: `${formatDay(localDate(removed.startsAt))} liberado${removed.reason ? ` (${removed.reason})` : ""}`, ...meta },
      tx,
    );
  });
}

export async function upcomingBlocks(now = new Date()) {
  return getDb().select().from(availabilityBlocks).where(gte(availabilityBlocks.endsAt, now)).orderBy(asc(availabilityBlocks.startsAt));
}

/* -------------------------------- Conexão --------------------------------- */

export async function saveConnection(actor: Actor, input: { email: string; refreshToken: string }, meta: Meta = {}) {
  const values = { id: "default", email: input.email, refreshTokenEnc: encrypt(input.refreshToken), calendarId: "primary", connectedAt: new Date(), connectedBy: actor.id };
  await getDb().transaction(async (tx) => {
    await tx.insert(googleCalendarConnection).values(values).onConflictDoUpdate({ target: googleCalendarConnection.id, set: values });
    await audit({ actor, action: "calendar.connect", resourceType: "calendar", summary: `Google Calendar conectado (${input.email})`, ...meta }, tx);
  });
}

export async function removeConnection(actor: Actor, meta: Meta = {}) {
  const connection = await getConnection();
  if (!connection) return;
  await revoke(connection.refreshTokenEnc);
  await getDb().transaction(async (tx) => {
    await tx.delete(googleCalendarConnection).where(eq(googleCalendarConnection.id, "default"));
    await audit({ actor, action: "calendar.disconnect", resourceType: "calendar", summary: `Google Calendar desconectado (${connection.email})`, ...meta }, tx);
  });
}

