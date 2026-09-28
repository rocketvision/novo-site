import { z } from "zod";

/** Corpo do salvamento: o conteúdo é validado depois pelo schema da seção. */
export const saveSectionSchema = z.object({
  version: z.number().int().min(0),
  content: z.unknown(),
});

export const versionOnlySchema = z.object({ version: z.number().int().min(0) });
