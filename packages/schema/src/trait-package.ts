import { z } from "zod";

export const TraitAdjustmentSchema = z.object({
  /** A Stat Sheet field id or key. */
  target: z.string().min(1).max(64),
  amount: z
    .number()
    .finite()
    .refine((n) => n !== 0, { message: "An adjustment cannot be 0." }),
});

export const TraitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  adjustments: z.array(TraitAdjustmentSchema).max(20).default([]),
});

export const TraitPackageKindSchema = z.enum(["species"]);

/** On a Creature: the reusable definition. */
export const TraitPackageDefinitionSchema = z.object({
  kind: TraitPackageKindSchema,
  traits: z.array(TraitSchema).max(50).default([]),
});

/** On a Character: a link to the source plus a snapshot of its traits. */
export const TraitSelectionSchema = z.object({
  kind: TraitPackageKindSchema,
  sourceId: z.string().min(1),
  sourceTitle: z.string().min(1),
  appliedAt: z.number(),
  traits: z.array(TraitSchema),
});

export type TraitAdjustment = z.infer<typeof TraitAdjustmentSchema>;
export type Trait = z.infer<typeof TraitSchema>;
export type TraitPackageKind = z.infer<typeof TraitPackageKindSchema>;
export type TraitPackageDefinition = z.infer<
  typeof TraitPackageDefinitionSchema
>;
export type TraitSelection = z.infer<typeof TraitSelectionSchema>;
