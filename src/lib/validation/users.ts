import { z } from "zod";
import { optionalText, text } from "@/lib/content/schemas";
import { emailSchema } from "./auth";

const name = text(120, "O nome");
const roleId = z.string().uuid("Escolha uma função.");

export const inviteUserSchema = z.object({ email: emailSchema, name, roleId });
export const updateUserSchema = z.object({ name, roleId, version: z.number().int().min(1) });
export const userStatusSchema = z.object({ status: z.enum(["active", "disabled"]), version: z.number().int().min(1) });

export const roleSchema = z.object({
  name: text(40, "O nome"),
  description: optionalText(160, "A descrição"),
  permissions: z.array(z.string().max(60)).max(100),
});
