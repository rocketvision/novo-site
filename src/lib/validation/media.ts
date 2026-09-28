import { z } from "zod";
import { optionalText, text } from "@/lib/content/schemas";

export const mediaUpdateSchema = z.object({
  alt: optionalText(300, "O texto alternativo"),
  filename: text(120, "O nome"),
  expectedUpdatedAt: z.string().datetime(),
});

export const mediaListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  filter: z.enum(["all", "unused", "no-alt"]).optional(),
  cursor: z.string().max(200).optional(),
});
