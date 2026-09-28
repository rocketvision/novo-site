import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const auditQuerySchema = z.object({
  categoria: z.enum(["auth", "section", "project", "media", "user", "role"]).optional(),
  pessoa: z.string().uuid().optional(),
  de: day.optional(),
  ate: day.optional(),
  antes: z.coerce.number().int().positive().optional(),
});
