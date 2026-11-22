import { z } from "zod";
import { id, text, MAX_TEXT_CHARS } from "./schema-primitives";

/** Optional, bounded world-entry setup. Old sessions remain compatible. */
export const worldEntrySchema = z
  .object({
    version: z.literal(1),
    location: z.discriminatedUnion("kind", [
      z
        .object({ kind: z.literal("canonical"), recordId: id, name: text })
        .strict(),
      z.object({ kind: z.literal("provisional"), name: text }).strict(),
    ]),
    at: z
      .object({
        year: z.number().int().finite(),
        // Calendar-specific upper bounds belong to calendarEngine.isValid():
        // custom calendars may have 13+ months or 400-day months.
        month: z.number().int().min(1).optional(),
        day: z.number().int().min(1).optional(),
        precision: z.enum(["year", "unit", "day", "anchor"]).optional(),
        unitId: id.optional(),
        anchorId: id.optional(),
        calendarRevision: z.number().int().positive().optional(),
        label: z.string().max(MAX_TEXT_CHARS).optional(),
      })
      .strict()
      .optional(),
    intent: z.enum(["explore", "scene", "opportunity"]),
    scenePrompt: text.optional(),
  })
  .strict();
