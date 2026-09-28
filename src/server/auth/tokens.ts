import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";

/** Token aleatório (CSPRNG) em base32 minúsculo. 20 bytes = 160 bits; 32 bytes = 256 bits. */
export function generateToken(bytes = 20) {
  const random = new Uint8Array(bytes);
  crypto.getRandomValues(random);
  return encodeBase32LowerCaseNoPadding(random);
}

/** Só o hash do token vai para o banco. */
export function hashToken(token: string) {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}
