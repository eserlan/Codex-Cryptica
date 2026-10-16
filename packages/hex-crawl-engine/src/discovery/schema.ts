import { z } from "zod";

/** Limits from data-model.md section 7. Output outside them is an AI failure. */
const TITLE = z.string().min(1).max(80);
const LONG_TEXT = z.string().min(1).max(1200);
const NOTE = z.string().min(1).max(600);
const ATMOSPHERE = z.string().min(1).max(400);

const LandmarkSchema = z.object({ title: TITLE, description: LONG_TEXT });
const EncounterSchema = z.object({ title: TITLE, description: LONG_TEXT });
const FactionPresenceSchema = z.object({
  faction: z.string().min(1).max(80).optional(),
  description: NOTE,
});

/** One schema per discovery part, so a single regeneration validates alone. */
export const StockingPartSchemas = {
  landmark: LandmarkSchema,
  encounter: EncounterSchema,
  hazard: NOTE,
  secret: NOTE,
  factionPresence: FactionPresenceSchema,
  atmosphere: ATMOSPHERE,
} as const;

/** The full six-part output the model must return (FR-034). */
export const HexStockingSchema = z.object(StockingPartSchemas);

export type HexStocking = z.infer<typeof HexStockingSchema>;
