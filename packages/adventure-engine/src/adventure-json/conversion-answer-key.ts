import { z } from "zod";
import { RumourTruthSchema, SourceReferenceSchema } from "./schema";

const text = z.string().min(1);
const citedSourceReference = SourceReferenceSchema.refine(
  (sourceRef) => Object.keys(sourceRef).length > 0,
  { message: "sourceRef must identify a known source location" },
);

const ConflictingClaimSchema = z
  .object({
    text,
    distinguishingTerm: text,
    sourceRef: citedSourceReference,
  })
  .strict();

function idGroupsAreUnique(groups: string[][]): boolean {
  return groups.every((ids) => new Set(ids).size === ids.length);
}

export const ACTIONABLE_DETAIL_CATEGORIES = [
  "read-aloud",
  "situation",
  "interaction",
  "trigger",
  "actor-reaction",
  "clue",
  "alternate-outcome",
  "consequence",
  "gm-only",
] as const;

/**
 * A short paraphrase of a fact the source states in one section. Details are
 * never invented mechanics, transitions or fields outside adventure-json/v1.
 * A converter should record unsupported inferences in the coverage report or in
 * `unresolved`; a detail recorded only in `unresolved` still counts as missing.
 */
export const ActionableDetailSchema = z
  .object({
    sourceId: text,
    category: z.enum(ACTIONABLE_DETAIL_CATEGORIES),
    detail: text,
  })
  .strict();

export type ActionableDetail = z.infer<typeof ActionableDetailSchema>;

export const ConversionAnswerKeyFieldsSchema = z
  .object({
    adventureFile: text,
    sections: z
      .array(
        z
          .object({
            sourceId: text,
            title: text,
            container: z.boolean().optional(),
          })
          .strict(),
      )
      .min(1),
    npcs: z.array(
      z.object({ name: text, motivation: text, sourceId: text }).strict(),
    ),
    secrets: z.array(
      z
        .object({ id: text, text, gmOnly: z.boolean(), sourceId: text })
        .strict(),
    ),
    sceneConditions: z.array(
      z.object({ sourceId: text, condition: text }).strict(),
    ),
    branch: z
      .object({ sourceId: text, description: text, optional: z.literal(true) })
      .strict(),
    alternativeSolution: z
      .object({
        obstacleSourceId: text,
        description: text,
        socialBypassOfCombat: z.boolean(),
        sourceId: text,
      })
      .strict(),
    missableClue: z
      .object({ clue: text, primarySourceId: text, alternativeSourceId: text })
      .strict()
      .refine((c) => c.primarySourceId !== c.alternativeSourceId, {
        message: "clue source IDs must differ",
      }),
    conclusions: z
      .array(
        z
          .object({
            id: text,
            statement: text,
            clues: z.array(z.object({ text, sourceId: text }).strict()).min(3),
          })
          .strict(),
      )
      .optional(),
    testimonies: z
      .array(
        z
          .object({
            id: text,
            npc: text,
            claim: text,
            truth: RumourTruthSchema,
            canonicalFact: text,
            sourceId: text,
          })
          .strict(),
      )
      .optional(),
    sourceAuthority: z
      .array(
        z
          .object({
            id: text,
            targetSourceId: text,
            expectedText: text,
            expectedTerm: text,
            supersededText: text,
            supersededTerm: text,
            correctionSource: citedSourceReference,
            expectedTitle: text,
            expectedItemCount: z.number().int().min(0).optional(),
          })
          .strict(),
      )
      .optional(),
    conflicts: z
      .array(
        z
          .object({
            id: text,
            claims: z.array(ConflictingClaimSchema).min(2),
          })
          .strict(),
      )
      .optional(),
    endings: z
      .array(z.object({ id: text, description: text, sourceId: text }).strict())
      .min(2),
    actionableDetails: z.array(ActionableDetailSchema).optional(),
  })
  .strict();

export const ConversionAnswerKeySchema = ConversionAnswerKeyFieldsSchema.refine(
  (k) =>
    idGroupsAreUnique([
      k.sections.map((s) => s.sourceId),
      k.secrets.map((s) => s.id),
      k.endings.map((e) => e.id),
      (k.conclusions ?? []).map((c) => c.id),
      (k.testimonies ?? []).map((t) => t.id),
    ]),
  {
    message:
      "section sourceIds, secret ids, ending ids, conclusion ids and testimony ids must be unique",
  },
).refine(
  (k) => {
    const sourceIds = new Set(k.sections.map((s) => s.sourceId));
    return (k.actionableDetails ?? []).every((d) => sourceIds.has(d.sourceId));
  },
  { message: "actionableDetails sourceId must be a sections sourceId" },
);

export type ConversionAnswerKey = z.infer<typeof ConversionAnswerKeySchema>;
