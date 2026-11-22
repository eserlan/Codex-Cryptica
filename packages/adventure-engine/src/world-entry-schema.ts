import { z } from "zod";
import { id, text } from "./schema-primitives";
import { adventureCalendarDateSchema } from "./historical-anchor-schemas";

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
    // Calendar-specific upper bounds belong to calendarEngine.isValid():
    // custom calendars may have 13+ months or 400-day months.
    at: adventureCalendarDateSchema.optional(),
    intent: z.enum(["explore", "scene", "opportunity"]),
    scenePrompt: text.optional(),
  })
  .strict();
