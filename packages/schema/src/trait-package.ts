import { z } from "zod";

export const MAX_TRAITS_PER_PACKAGE = 50;
export const MAX_ADJUSTMENTS_PER_TRAIT = 20;

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
  adjustments: z
    .array(TraitAdjustmentSchema)
    .max(MAX_ADJUSTMENTS_PER_TRAIT)
    .default([]),
});

export const TraitPackageKindSchema = z.enum(["species"]);

/** On a Creature: the reusable definition. */
export const TraitPackageDefinitionSchema = z.object({
  kind: TraitPackageKindSchema,
  traits: z.array(TraitSchema).max(MAX_TRAITS_PER_PACKAGE).default([]),
});

/** On a Character: a link to the source plus a snapshot of its traits. */
export const TraitSelectionSchema = z.object({
  kind: TraitPackageKindSchema,
  sourceId: z.string().min(1),
  sourceTitle: z.string().min(1),
  appliedAt: z.number(),
  traits: z.array(TraitSchema).max(MAX_TRAITS_PER_PACKAGE),
});

export const TraitSelectionsSchema = z
  .array(TraitSelectionSchema)
  .max(10)
  .superRefine((selections, ctx) => {
    const kinds = new Set<TraitPackageKind>();
    selections.forEach((selection, index) => {
      if (kinds.has(selection.kind)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "kind"],
          message: `Only one ${selection.kind} selection is allowed.`,
        });
      }
      kinds.add(selection.kind);
    });
  });

export type TraitAdjustment = z.infer<typeof TraitAdjustmentSchema>;
export type Trait = z.infer<typeof TraitSchema>;
export type TraitPackageKind = z.infer<typeof TraitPackageKindSchema>;
export type TraitPackageDefinition = z.infer<
  typeof TraitPackageDefinitionSchema
>;
export type TraitSelection = z.infer<typeof TraitSelectionSchema>;
export type TraitSelections = z.infer<typeof TraitSelectionsSchema>;
