import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Hash de senha com Argon2id (vencedor da Password Hashing Competition, recomendado pela OWASP).
 *
 * Parâmetros: 46 MiB de memória, 1 iteração, 1 thread. É uma das configurações equivalentes
 * recomendadas pela OWASP (Password Storage Cheat Sheet) e roda em cerca de 50 a 100 ms
 * em uma função serverless. O hash sai no formato PHC ($argon2id$v=19$m=...,t=...,p=...$salt$hash),
 * que carrega os próprios parâmetros: se forem aumentados no futuro, `needsRehash` detecta e o
 * hash é atualizado no próximo login.
 */
const PARAMS = { algorithm: 2 /* Argon2id */, memoryCost: 47104, timeCost: 1, parallelism: 1 } as const;

export function hashPassword(password: string) {
  return hash(password, PARAMS);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function needsRehash(passwordHash: string) {
  return !passwordHash.startsWith(`$argon2id$v=19$m=${PARAMS.memoryCost},t=${PARAMS.timeCost},p=${PARAMS.parallelism}$`);
}

/**
 * Hash de uma senha aleatória, gerado uma vez por instância. Usado para gastar o mesmo tempo
 * de verificação quando o e-mail não existe, evitando descobrir usuários pelo tempo de resposta.
 */
let dummyHash: Promise<string> | undefined;
export function getDummyHash() {
  dummyHash ??= hash(crypto.randomUUID(), PARAMS);
  return dummyHash;
}
