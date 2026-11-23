import { z } from "zod";
import type { AdventureTurnProposal } from "./types";
import {
  id,
  text,
  narration,
  timestamp,
  MAX_TEXT_CHARS,
} from "./schema-primitives";
import {
  visiblePatchSchema,
  hiddenPatchSchema,
  newProvisionalFactSchema,
  newCausalCommitmentSchema,
  persistedVisiblePatchSchema,
  persistedHiddenPatchSchema,
} from "./state-schemas";
import { bandSchema, outcomeSchema, resolvedRollSchema } from "./roll-schemas";
import { timeAdvanceSchema } from "./world-time-schemas";
import { placeMoveSchema, placeCuesSchema } from "./place-schemas";
import {
  packageEventProposalSchema,
  actorEventProposalSchema,
} from "./package-progress-schemas";

const scenarioElaborationProposalSchema = z
  .object({
    scenarioId: id,
    stage: z.enum(["hearsay", "actionable-clue", "revelation-crisis"]),
    discovery: text.optional(),
  })
  .strict();

// Package-authored secret IDs are opaque keys, including leading/trailing spaces.
const secretIdSchema = z.string().min(1);
const completeProposalSchema = z.object({
  kind: z.literal("complete"),
  narration,
  timeAdvance: timeAdvanceSchema.optional(),
  moveTo: placeMoveSchema.optional(),
  placeCues: placeCuesSchema,
  personRefs: z.array(id).max(8).optional(),
  sceneTransition: z
    .object({
      sceneId: id.optional(),
      title: z.string().min(1).max(120).optional(),
    })
    .optional(),
  visiblePatch: visiblePatchSchema,
  hiddenPatch: hiddenPatchSchema,
  revealSecretIds: z.array(secretIdSchema),
  revealScenarioIds: z.array(id).max(8).optional(),
  elaborateScenarios: z
    .array(scenarioElaborationProposalSchema)
    .max(8)
    .optional(),
  provisionalFacts: z.array(newProvisionalFactSchema),
  causalCommitments: z.array(newCausalCommitmentSchema).max(4).optional(),
  sourceRecordIds: z.array(id),
  suggestedActions: z.array(text).length(3).optional(),
  packageEvents: z.array(packageEventProposalSchema).max(8).optional(),
  actorEvents: z.array(actorEventProposalSchema).max(8).optional(),
});

const rollProposalSchema = z.object({
  kind: z.literal("roll-required"),
  setupNarration: narration.optional(),
  uncertainty: text,
  stakes: text,
  dice: z
    .object({
      expression: text,
      outcomeBands: z.array(bandSchema).min(1).max(12),
    })
    .optional(),
  sourceRecordIds: z.array(id),
  suggestedActions: z.array(text).length(3).optional(),
});

export const turnProposalSchema = z.discriminatedUnion("kind", [
  completeProposalSchema,
  rollProposalSchema,
]);

export const generationReasoningEffortSchema = z.enum([
  "low",
  "medium",
  "high",
  "xhigh",
]);
export const generationTransportSchema = z.enum(["interaction", "stateless"]);
export const generationThreadModeSchema = z.enum(["new", "continued", "reset"]);
export const generationResetReasonSchema = z.enum([
  "turn-refresh",
  "provider-expiry",
  "model-change",
  "source-change",
  "scene-boundary",
  "revision-mismatch",
  "rejected-turn",
  "app-lifetime",
  "unknown",
]);

/**
 * Bounded, privacy-conscious generation diagnostics. All fields optional so
 * legacy turns parse; unknown keys are stripped rather than rejected so a
 * future additive field never breaks an older reader.
 */
export const generationMetadataSchema = z.object({
  modelKey: z.string().min(1).max(120).optional(),
  reasoningEffort: generationReasoningEffortSchema.optional(),
  transport: generationTransportSchema.optional(),
  threadMode: generationThreadModeSchema.optional(),
  resetReason: generationResetReasonSchema.optional(),
  requestChars: z.number().int().nonnegative().optional(),
  sourceCounts: z
    .record(z.string().min(1).max(64), z.number().int().nonnegative())
    .optional(),
  scenarioIds: z.array(id).max(32).optional(),
  progressCategory: z.string().min(1).max(64).optional(),
});

export const persistedTurnSchema = z.object({
  id,
  sequence: z.number().int().nonnegative(),
  inputId: id,
  // The opening turn has no player action yet.
  playerAction: z.string().max(MAX_TEXT_CHARS),
  rollOutcome: outcomeSchema.optional(),
  resolvedRoll: resolvedRollSchema.optional(),
  narration,
  visiblePatch: persistedVisiblePatchSchema,
  hiddenPatch: persistedHiddenPatchSchema,
  revealedSecretIds: z.array(secretIdSchema),
  sourceRecordIds: z.array(id),
  provisionalFactIds: z.array(id),
  causalCommitmentIds: z.array(id).optional(),
  generation: generationMetadataSchema.optional(),
  committedAt: timestamp,
  timeAdvance: timeAdvanceSchema
    .pick({ minutes: true, cause: true })
    .optional(),
  suggestedActions: z.array(text).length(3).optional(),
  dropped: z.array(z.string().max(240)).max(24).optional(),
});

export function parseTurnProposal(input: unknown): AdventureTurnProposal {
  return turnProposalSchema.parse(input) as AdventureTurnProposal;
}
