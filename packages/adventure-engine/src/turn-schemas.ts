import { z } from "zod";
import type { AdventureTurnProposal } from "./types";
import {
  id,
  text,
  narration,
  timestamp,
  MAX_TEXT_CHARS,
  threadGoalSchema,
  threadOutcomeResultSchema,
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

const threadOutcomeProposalSchema = z
  .object({
    threadId: id.optional(),
    scenarioId: id.optional(),
    goal: threadGoalSchema.optional(),
    result: threadOutcomeResultSchema,
    reason: text,
    supportingFactIds: z.array(id).max(16).optional(),
    supportingCommitmentIds: z.array(id).max(16).optional(),
    unresolvedConsequences: z.array(text).max(6).optional(),
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
  threadOutcomes: z.array(threadOutcomeProposalSchema).max(4).optional(),
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
const localSaveOperationSchema = z.enum([
  "turn-commit",
  "ooc-exchange",
  "artwork-save",
  "dice-preset",
  "resource-counter",
  "state-correction",
  "scenario-update",
  "place-link",
  "story-summary",
  "session-resume",
  "external-or-concurrent",
  "unknown",
]);

const directorDeliverySchema = z.object({
  status: z.enum(["included", "truncated", "omitted", "retained", "unknown"]),
  reason: z.enum([
    "delivered",
    "budget",
    "disabled",
    "not-applicable",
    "retained-unchanged",
    "unknown",
  ]),
  deliveredChars: z.number().int().nonnegative().max(100_000),
  focusedScenarioId: id.optional(),
  recoveryReason: z
    .enum(["none", "dialogue", "investigative", "both"])
    .optional(),
  requestedDevelopmentKind: z.string().min(1).max(80).optional(),
});

const actionResolutionSchema = z.object({
  outcome: z.enum([
    "resolved",
    "roll-required",
    "credible-blocked",
    "clarification",
    "unresolved",
    "unknown",
  ]),
  validation: z.enum(["accepted", "corrected", "rejected", "unknown"]),
  evidenceCategory: z.enum([
    "roll-resolved",
    "roll-pending",
    "movement",
    "discovery",
    "state-patch",
    "witness-limit",
    "observation",
    "credible-block",
    "clarification",
    "non-answer",
    "quiet-play",
    "dropped-patch",
    "rejected-turn",
    "none",
  ]),
  droppedCount: z.number().int().positive().max(32).optional(),
  droppedKinds: z.array(z.string().min(1).max(40)).max(16).optional(),
  resolvedRoll: z.boolean().optional(),
});

export const generationMetadataSchema = z.object({
  modelKey: z.string().min(1).max(120).optional(),
  reasoningEffort: generationReasoningEffortSchema.optional(),
  transport: generationTransportSchema.optional(),
  threadMode: generationThreadModeSchema.optional(),
  resetReason: generationResetReasonSchema.optional(),
  revisionMismatchCause: localSaveOperationSchema.optional(),
  directorDelivery: directorDeliverySchema.optional(),
  actionResolution: actionResolutionSchema.optional(),
  requestChars: z.number().int().nonnegative().max(1_000_000).optional(),
  sourceCounts: z
    .record(
      z.string().min(1).max(32),
      z.number().int().nonnegative().max(1_000_000),
    )
    .superRefine((counts, context) => {
      if (Object.keys(counts).length > 8) {
        context.addIssue({
          code: "custom",
          message: "too many source count categories",
        });
      }
    })
    .optional(),
  scenarioIds: z.array(id).max(32).optional(),
  progressCategory: z
    .enum([
      "scenario-stage-or-status-change",
      "actionable-discovery",
      "obstacle-advanced-or-resolved",
      "causal-state-change",
      "consequential-player-choice",
      "useful-negative-finding",
      "repeated-non-answer",
      "ordinary-interaction",
      "no-observable-change",
    ])
    .optional(),
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
