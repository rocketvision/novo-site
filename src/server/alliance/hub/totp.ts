import "server-only";
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { decodeBase32IgnorePadding, encodeBase32UpperCaseNoPadding } from "@oslojs/encoding";
import { env } from "@/server/env";
import { generateToken, hashToken } from "@/server/auth/tokens";

/**
 * Verificação em duas etapas do Alliance Hub: TOTP (RFC 6238, o padrão dos aplicativos autenticadores:
 * HMAC-SHA1, 6 dígitos, janelas de 30 s), com tolerância de uma janela para relógios fora de sincronia.
 * O segredo fica cifrado (AES-256-GCM) com uma chave derivada de ALLIANCE_ENCRYPTION_KEY; os códigos de
 * recuperação ficam só como hash.
 */

export const TOTP_ISSUER = "Rocket Alliance";
const STEP = 30;
const DIGITS = 6;

export function isTwoFactorAvailable() {
  return Boolean(env.ALLIANCE_ENCRYPTION_KEY);
}

function key() {
  if (!env.ALLIANCE_ENCRYPTION_KEY) throw new Error("ALLIANCE_ENCRYPTION_KEY não configurada.");
  return Buffer.from(hkdfSync("sha256", env.ALLIANCE_ENCRYPTION_KEY, "rocket-alliance", "hub-totp-secret", 32));
}

export function sealSecret(secret: Uint8Array) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(Buffer.from(secret)), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function openSecret(sealed: string) {
  const [iv, tag, data] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return new Uint8Array(Buffer.concat([decipher.update(data), decipher.final()]));
}

export function newSecret() {
  return new Uint8Array(randomBytes(20));
}

export function secretToBase32(secret: Uint8Array) {
  return encodeBase32UpperCaseNoPadding(secret);
}

export function base32ToSecret(value: string) {
  return decodeBase32IgnorePadding(value.toUpperCase().replace(/\s/g, ""));
}

/** URI que os aplicativos autenticadores leem (pelo QR code ou digitando a chave). */
export function otpauthUri(secret: Uint8Array, account: string) {
  const label = encodeURIComponent(`${TOTP_ISSUER}:${account}`);
  const q = new URLSearchParams({ secret: secretToBase32(secret), issuer: TOTP_ISSUER, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP) });
  return `otpauth://totp/${label}?${q}`;
}

export function totpAt(secret: Uint8Array, counter: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", Buffer.from(secret)).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** Confere o código com uma janela de tolerância para cada lado (comparação em tempo constante). */
export function verifyTotp(secret: Uint8Array, code: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(now / 1000 / STEP);
  let ok = false;
  for (const delta of [-1, 0, 1]) {
    const expected = Buffer.from(totpAt(secret, counter + delta));
    if (timingSafeEqual(expected, Buffer.from(code))) ok = true;
  }
  return ok;
}

/** Dez códigos de recuperação de uso único (mostrados uma vez; o banco guarda só o hash). */
export function newRecoveryCodes() {
  const codes = Array.from({ length: 10 }, () => {
    const raw = generateToken(10).slice(0, 10);
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { codes, hashes: codes.map((c) => hashToken(normalizeRecovery(c))) };
}

export function normalizeRecovery(code: string) {
  return code.trim().toLowerCase().replace(/[^a-z2-7]/g, "");
}
