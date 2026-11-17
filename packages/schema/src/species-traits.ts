import { z } from "zod";
import { StatSheetFieldKeySchema } from "./stat-sheet";

export const SpeciesAdjustmentSchema = z.object({
  key: StatSheetFieldKeySchema,
  amount: z.number().finite(),
});

export const SpeciesTraitSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Trait name is required"),
  description: z.string(),
  adjustments: z.array(SpeciesAdjustmentSchema),
});

function uniqueTraits(traits: { id: string }[]) {
  return new Set(traits.map((trait) => trait.id)).size === traits.length;
}

export const SpeciesDefinitionSchema = z.object({
  kind: z.literal("species"),
  version: z.literal(1),
  traits: z
    .array(SpeciesTraitSchema)
    .refine(uniqueTraits, "Trait IDs must be unique"),
});

export const SpeciesResolutionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("bound"), fieldId: z.string().min(1) }),
  z.object({ status: z.literal("skipped"), reason: z.string().min(1) }),
]);

export const AppliedSpeciesSchema = z.object({
  kind: z.literal("species"),
  version: z.literal(1),
  source: z.object({
    entityId: z.string().min(1),
    title: z.string().min(1),
    /** Local link is distinct from historical identity, and may be unresolved. */
    localEntityId: z.string().min(1).nullable(),
  }),
  traits: z
    .array(
      SpeciesTraitSchema.extend({
        adjustments: z.array(
          SpeciesAdjustmentSchema.extend({
            resolution: SpeciesResolutionSchema,
          }),
        ),
      }),
    )
    .refine(uniqueTraits, "Trait IDs must be unique"),
});

export type SpeciesDefinition = z.infer<typeof SpeciesDefinitionSchema>;
export type SpeciesTrait = z.infer<typeof SpeciesTraitSchema>;
export type AppliedSpecies = z.infer<typeof AppliedSpeciesSchema>;
