import { z } from "zod";

/**
 * Política de senha alinhada ao NIST SP 800-63B: comprimento mínimo alto, sem regras de composição
 * arbitrárias e bloqueio das senhas mais comuns.
 */
const COMMON = new Set([
  "123456789012", "senha1234567", "password1234", "qwertyuiopas", "rocketvision", "rocketvision1",
  "rocketvision123", "123456123456", "abcdefghijkl", "aaaaaaaaaaaa", "000000000000", "111111111111",
]);

export const passwordSchema = z
  .string()
  .min(12, "Use pelo menos 12 caracteres.")
  .max(128, "Use no máximo 128 caracteres.")
  .refine((v) => !COMMON.has(v.toLowerCase()), "Essa senha é muito comum. Escolha outra.")
  .refine((v) => new Set(v).size >= 5, "Use uma senha menos repetitiva.");
