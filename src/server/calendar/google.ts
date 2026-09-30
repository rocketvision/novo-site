import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { googleCalendarConnection } from "@/server/db/schema";
import { env } from "@/server/env";
import { log } from "@/server/log";

/**
 * Google Calendar pela API REST (sem SDK): OAuth da conta que recebe as calls, consulta de horários
 * ocupados, feriados, criação do evento com Google Meet e cancelamento.
 *
 * A conexão é feita uma vez pelo CMS (Agenda → Conectar). O refresh token fica no banco, criptografado
 * com AES-256-GCM e uma chave derivada de GOOGLE_CLIENT_SECRET: um vazamento só do banco não o expõe.
 */

const SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.freebusy", "openid", "email"];
/** Feriados nacionais (calendário público do Google). */
export const HOLIDAYS_CALENDAR = "pt-br.brazilian#holiday@group.v.calendar.google.com";

export class CalendarNotConfiguredError extends Error {}

export const isCalendarConfigured = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
/**
 * Endereço de volta do Google: o do próprio CMS em que a conexão foi iniciada (produção, preview ou
 * local). Cada um precisa estar cadastrado nas "URIs de redirecionamento autorizados" do cliente OAuth.
 */
export const redirectUri = (origin: string) => `${origin}/api/cms/google/callback`;
/** Cookie com o "state" do OAuth (proteção contra CSRF na volta do Google). */
export const STATE_COOKIE = "rv_google_state";

/* ------------------------------ Criptografia ------------------------------ */

function key() {
  if (!env.GOOGLE_CLIENT_SECRET) throw new CalendarNotConfiguredError();
  return Buffer.from(hkdfSync("sha256", env.GOOGLE_CLIENT_SECRET, "rocket-vision", "google-calendar-refresh-token", 32));
}
export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}
export function decrypt(sealed: string) {
  const [iv, tag, data] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/* ---------------------------------- OAuth --------------------------------- */

export function consentUrl(state: string, origin: string) {
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // Sempre pede o consentimento: garante um refresh token novo a cada conexão.
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string; id_token?: string; scope?: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID ?? "", client_secret: env.GOOGLE_CLIENT_SECRET ?? "", ...body }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`google_token_${response.status}`);
  return response.json();
}

/** Troca o código do consentimento pelos tokens e descobre o e-mail da conta. */
export async function exchangeCode(code: string, origin: string) {
  const tokens = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(origin) });
  if (!tokens.refresh_token) throw new Error("google_no_refresh_token");
  const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } }).then((r) => r.json() as Promise<{ email?: string }>);
  return { refreshToken: tokens.refresh_token, email: info.email ?? "conta Google" };
}

export async function getConnection() {
  const [row] = await getDb().select().from(googleCalendarConnection).where(eq(googleCalendarConnection.id, "default")).limit(1);
  return row ?? null;
}

let cached: { token: string; expires: number; for: string } | null = null;

async function accessToken() {
  if (!isCalendarConfigured()) throw new CalendarNotConfiguredError();
  const connection = await getConnection();
  if (!connection) throw new CalendarNotConfiguredError();
  if (cached && cached.for === connection.refreshTokenEnc && cached.expires > Date.now() + 60_000) return { token: cached.token, calendarId: connection.calendarId };
  const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: decrypt(connection.refreshTokenEnc) });
  cached = { token: tokens.access_token, expires: Date.now() + tokens.expires_in * 1000, for: connection.refreshTokenEnc };
  return { token: tokens.access_token, calendarId: connection.calendarId };
}

/** Revoga o acesso no Google (ao desconectar). Falha aqui não impede apagar a conexão. */
export async function revoke(refreshTokenEnc: string) {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(refreshTokenEnc))}`, { method: "POST", signal: AbortSignal.timeout(8_000) });
  } catch (error) {
    log.warn("calendar.revoke_failed", { error });
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = await accessToken();
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    log.error("calendar.api_failed", { path: path.split("?")[0], status: response.status, text: text.slice(0, 300) });
    throw new Error(`google_calendar_${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

/* ------------------------------- Consultas -------------------------------- */

/** Intervalos ocupados na agenda conectada. */
export async function busyIntervals(from: Date, to: Date) {
  const { calendarId } = await accessToken();
  const data = await api<{ calendars: Record<string, { busy: { start: string; end: string }[] }> }>("/freeBusy", {
    method: "POST",
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: calendarId }] }),
  });
  return Object.values(data.calendars).flatMap((c) => c.busy ?? []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

/** Feriados nacionais no período: { "2026-11-02": "Finados" }. */
export async function holidays(from: Date, to: Date): Promise<Record<string, string>> {
  try {
    const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: "true", maxResults: "50" });
    const data = await api<{ items: { summary: string; start: { date?: string } }[] }>(`/calendars/${encodeURIComponent(HOLIDAYS_CALENDAR)}/events?${q}`);
    return Object.fromEntries(data.items.filter((e) => e.start.date).map((e) => [e.start.date!, e.summary]));
  } catch {
    // Sem acesso ao calendário de feriados, segue sem eles (a agenda da pessoa continua valendo).
    return {};
  }
}

/** Cria o evento com Google Meet. Com e-mail do cliente, ele recebe o convite do Google. */
export async function createMeetEvent(input: { start: Date; end: Date; summary: string; description: string; attendeeEmail?: string }) {
  const { calendarId } = await accessToken();
  const q = new URLSearchParams({ conferenceDataVersion: "1", sendUpdates: input.attendeeEmail ? "all" : "none" });
  const event = await api<{ id: string; htmlLink: string; hangoutLink?: string; conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] } }>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${q}`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start.toISOString(), timeZone: "America/Sao_Paulo" },
        end: { dateTime: input.end.toISOString(), timeZone: "America/Sao_Paulo" },
        attendees: input.attendeeEmail ? [{ email: input.attendeeEmail }] : undefined,
        conferenceData: { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }, { method: "email", minutes: 60 }] },
      }),
    },
  );
  const meetUrl = event.hangoutLink ?? event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
  return { id: event.id, eventUrl: event.htmlLink, meetUrl };
}

export async function deleteEvent(eventId: string) {
  const { calendarId } = await accessToken();
  try {
    await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, { method: "DELETE" });
  } catch (error) {
    // Já removido no Google (410/404): o cancelamento segue.
    if (!(error instanceof Error && /google_calendar_(404|410)/.test(error.message))) throw error;
  }
}
