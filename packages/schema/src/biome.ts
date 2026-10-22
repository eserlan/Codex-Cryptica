import { z } from "zod";

/** Longest free-text value a user can store in one biome field. */
export const BIOME_OWN_TEXT_MAX = 4000;
export const BIOME_REFERENCE_LINKS_MAX = 10;

export const RangeSchema = z
  .object({
    low: z.number(),
    high: z.number(),
    unit: z.string().min(1),
    note: z.string().optional(),
  })
  .refine((range) => range.low <= range.high, {
    message: "A range's low value cannot be above its high value.",
  });

export type Range = z.infer<typeof RangeSchema>;

export const STATEMENT_BASES = [
  "pattern",
  "simplification",
  "exception",
] as const;

export const StatementSchema = z.object({
  text: z.string().min(1),
  basis: z.enum(STATEMENT_BASES),
  sourceIds: z.array(z.string()).default([]),
});

export type Statement = z.infer<typeof StatementSchema>;

export const BiomeSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().optional(),
  year: z.number().optional(),
  url: z.string().optional(),
});

export type BiomeSource = z.infer<typeof BiomeSourceSchema>;

export const BiomeConditionsSchema = z.object({
  temperature: RangeSchema.optional(),
  seasonality: z.array(StatementSchema).default([]),
  precipitation: RangeSchema.optional(),
  elevation: RangeSchema.optional(),
  waterAvailability: z.array(StatementSchema).default([]),
  notes: z.array(StatementSchema).default([]),
});

export type BiomeConditions = z.infer<typeof BiomeConditionsSchema>;

/** A copy of a reference biome, taken when a profile was created. */
export const BiomeReferenceSnapshotSchema = z.object({
  biomeId: z.string().min(1),
  name: z.string().min(1),
  capturedAt: z.number(),
  conditions: BiomeConditionsSchema,
  landscape: z.array(StatementSchema).default([]),
  vegetation: z.array(StatementSchema).default([]),
  wildlife: z.array(StatementSchema).default([]),
  resources: z.array(StatementSchema).default([]),
  hazards: z.array(StatementSchema).default([]),
  sourceIds: z.array(z.string()).default([]),
  sources: z.array(BiomeSourceSchema).default([]),
});

export type BiomeReferenceSnapshot = z.infer<
  typeof BiomeReferenceSnapshotSchema
>;

const ownText = z.string().max(BIOME_OWN_TEXT_MAX).default("");

export const BiomeOwnFieldsSchema = z.object({
  climate: z
    .object({
      temperature: RangeSchema.optional(),
      precipitation: RangeSchema.optional(),
      seasonality: z.string().max(BIOME_OWN_TEXT_MAX).optional(),
    })
    .default({}),
  terrain: ownText,
  vegetation: ownText,
  water: ownText,
  pressures: ownText,
  notes: ownText,
});

export type BiomeOwnFields = z.infer<typeof BiomeOwnFieldsSchema>;

export const BIOME_ALTERATION_ASPECTS = [
  "climate",
  "terrain",
  "vegetation",
  "water",
  "pressures",
  "other",
] as const;

export type BiomeAlterationAspect = (typeof BIOME_ALTERATION_ASPECTS)[number];

/** A deliberate fantasy or science-fiction change, with its cause and effects. */
export const BiomeAlterationSchema = z.object({
  id: z.string().min(1),
  aspect: z.enum(BIOME_ALTERATION_ASPECTS),
  description: z.string().trim().min(1).max(BIOME_OWN_TEXT_MAX),
  cause: z.string().max(BIOME_OWN_TEXT_MAX).default(""),
  effects: z.array(z.string().max(BIOME_OWN_TEXT_MAX)).default([]),
  aiAssisted: z.boolean().optional(),
});

export type BiomeAlteration = z.infer<typeof BiomeAlterationSchema>;

export const BiomeReferenceLinkSchema = z.object({
  url: z.string().refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Reference links must start with https://"),
  label: z.string().max(200).default(""),
});

export type BiomeReferenceLink = z.infer<typeof BiomeReferenceLinkSchema>;

/** The structured record stored in an entity's `biome` field. */
export const BiomeProfileSchema = z.object({
  version: z.literal(1),
  reference: BiomeReferenceSnapshotSchema.nullable(),
  own: BiomeOwnFieldsSchema.default({
    climate: {},
    terrain: "",
    vegetation: "",
    water: "",
    pressures: "",
    notes: "",
  }),
  alterations: z.array(BiomeAlterationSchema).default([]),
  illustrationPrompt: z.string().optional(),
  referenceLinks: z
    .array(BiomeReferenceLinkSchema)
    .max(BIOME_REFERENCE_LINKS_MAX)
    .default([]),
});

export type BiomeProfile = z.infer<typeof BiomeProfileSchema>;
