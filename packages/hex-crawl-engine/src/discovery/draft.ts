import { z } from "zod";

export const DISCOVERY_PART_IDS = [
  "landmark",
  "encounter",
  "hazard",
  "secret",
  "factionPresence",
  "atmosphere",
] as const;

export type DiscoveryPartId = (typeof DISCOVERY_PART_IDS)[number];

export const DraftPartSchema = z.object({
  text: z.string().min(1).max(2000),
  factionName: z.string().min(1).max(80).optional(),
  source: z.enum(["ai", "tables"]),
  status: z.enum(["pending", "saved", "discarded"]),
});

export type DraftPart = z.infer<typeof DraftPartSchema>;

export const HexDiscoveryDraftSchema = z.object({
  source: z.enum(["ai", "tables"]),
  createdAt: z.number(),
  usedGeneralTables: z.boolean().optional(),
  parts: z.object({
    landmark: DraftPartSchema,
    encounter: DraftPartSchema,
    hazard: DraftPartSchema,
    secret: DraftPartSchema,
    factionPresence: DraftPartSchema,
    atmosphere: DraftPartSchema,
  }),
});

export type HexDiscoveryDraft = z.infer<typeof HexDiscoveryDraftSchema>;

/** A draft is kept until no part is pending (FR-033a). */
export function hasPendingParts(draft: HexDiscoveryDraft): boolean {
  return DISCOVERY_PART_IDS.some((id) => draft.parts[id].status === "pending");
}
