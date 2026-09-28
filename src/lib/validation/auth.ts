import { z } from "zod";
import { passwordSchema } from "./password";

export const emailSchema = z.string().trim().toLowerCase().max(254, "E-mail muito longo.").email("Informe um e-mail válido.");

export const loginSchema = z.object({
  email: emailSchema,
  // No login não se aplica a política de senha: só limites de tamanho.
  password: z.string().min(1, "Informe a senha.").max(128, "Senha muito longa."),
  next: z.string().max(300).optional(),
});

export const resetRequestSchema = z.object({ email: emailSchema });

export const setPasswordSchema = z.object({
  token: z.string().min(1).max(100),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual.").max(128),
  newPassword: passwordSchema,
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120, "Nome muito longo."),
});
