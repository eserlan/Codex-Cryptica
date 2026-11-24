import { z } from "zod";
import {
  id,
  text,
  narration,
  timestamp,
  threadGoalSchema,
  threadOutcomeSchema,
} from "./schema-primitives";
import {
  visibleStateSchema,
  hiddenStateSchema,
  provisionalFactSchema,
  causalCommitmentSchema,
} from "./state-schemas";
import { dicePresetSchema, pendingRollSchema } from "./roll-schemas";
import { worldTimeSchema } from "./world-time-schemas";
import { placeSchema, MAX_PLACES } from "./place-schemas";
import { worldEntrySchema } from "./world-entry-schema";
import {
  sourcePackageRefSchema,
  packageProgressSchema,
} from "./package-progress-schemas";
import { persistedTurnSchema } from "./turn-schemas";
import { scenarioCollectionSchema } from "./scenario-schemas";
import { historicalAnchorSchema } from "./historical-anchor-schemas";

export const CURRENT_ADVENTURE_SCHEMA_VERSION = 3;
export const MAX_OOC_EXCHANGES = 50;

const sourceSchema = z.object({
  recordId: id,
  recordType: text,
  displayName: text,
  role: z.enum(["player-character", "anchor", "turn-source"]),
  availability: z.enum(["available", "unavailable"]),
  lastResolvedAt: timestamp.optional(),
});

const resourceCounterSchema = z.object({
  id,
  label: text,
  value: z.number().finite(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const playerCharacterSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("canonical"), recordId: id, name: text }),
  z.object({ kind: z.literal("provisional"), name: text, description: text }),
]);

export const MAX_STORY_SO_FAR_CHARS = 1_500;
const storySoFarSchema = z
  .object({
    text: z.string().trim().min(1).max(MAX_STORY_SO_FAR_CHARS),
    throughSequence: z.number().int().nonnegative(),
    updatedAt: timestamp,
  })
  .strict();

export const emergentThreadSchema = z
  .object({
    id,
    title: z.string().trim().min(1).max(160),
    goal: threadGoalSchema.optional(),
    status: z.enum(["open", "resolved", "abandoned", "cold"]),
    outcome: threadOutcomeSchema.optional(),
    provenance: z.enum(["play", "ooc", "mixed"]),
    topicTokens: z.array(z.string().trim().min(1).max(48)).max(16),
    linkedPersonIds: z.array(id).max(24),
    linkedPlaceIds: z.array(id).max(24),
    linkedFactIds: z.array(id).max(32),
    linkedCommitmentIds: z.array(id).max(24),
    openQuestions: z.array(text).max(8),
    knownConsequences: z.array(text).max(12),
    gmOnlyDevelopments: z.array(text).max(8),
    linkedScenarioId: id.optional(),
    createdAtTurnId: id,
    updatedAtTurnId: id,
    turnCount: z.number().int().nonnegative(),
  })
  .strict();

export const adventureSessionSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_ADVENTURE_SCHEMA_VERSION),
    id,
    vaultId: id,
    title: text,
    status: z.enum(["active", "archived"]),
    createdAt: timestamp,
    updatedAt: timestamp,
    lastPlayedAt: timestamp,
    revision: z.number().int().nonnegative(),
    playerCharacter: playerCharacterSchema,
    premise: text,
    sourceRecords: z.array(sourceSchema),
    sourcePackage: sourcePackageRefSchema.optional(),
    packageProgress: packageProgressSchema.optional(),
    scenarioCollection: scenarioCollectionSchema.optional(),
    worldEntry: worldEntrySchema.optional(),
    historicalAnchor: historicalAnchorSchema.optional(),
    worldTime: worldTimeSchema.optional(),
    places: z.array(placeSchema).max(MAX_PLACES).optional(),
    currentPlaceId: id.optional(),
    storySoFar: storySoFarSchema.optional(),
    // Artwork is parsed independently so future or damaged data survives saves.
    artwork: z.unknown().optional(),
    people: z
      .array(
        z.object({
          id,
          name: z.string().min(1).max(120),
          aliases: z.array(z.string().min(1).max(120)).max(8).default([]),
          linkedFactIds: z.array(id).max(32).default([]),
          sourceRecordId: id.optional(),
        }),
      )
      .max(200)
      .optional(),
    scenes: z
      .array(
        z.object({
          id,
          placeId: id,
          introducedTurnId: id,
          endedTurnId: id.optional(),
          title: z.string().min(1).max(120).optional(),
        }),
      )
      .max(200)
      .optional(),
    visibleState: visibleStateSchema,
    hiddenState: hiddenStateSchema,
    provisionalFacts: z.array(provisionalFactSchema).max(60),
    causalCommitments: z.array(causalCommitmentSchema).optional(),
    emergentThreads: z.array(emergentThreadSchema).max(16).optional(),
    focusedEmergentThreadId: id.nullable().optional(),
    dismissedProvisionalFactIds: z.array(id).max(60).optional().default([]),
    turns: z.array(persistedTurnSchema),
    oocExchanges: z
      .array(
        z
          .object({
            id,
            kind: z.literal("ooc"),
            question: text,
            answer: narration.optional(),
            status: z.enum(["pending", "answered", "failed"]),
            classification: z
              .enum([
                "established",
                "hypothetical",
                "meta-rules",
                "canon-conflict",
                "secret-refusal",
              ])
              .optional(),
            committedFactIds: z.array(id).max(16).optional(),
            conflictNotice: text.optional(),
            errorMessage: text.optional(),
            afterTurnCount: z.number().int().nonnegative(),
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .strict(),
      )
      .max(MAX_OOC_EXCHANGES)
      .optional(),
    pendingRoll: pendingRollSchema.nullable(),
    // Phase 2, additive: absent on a schemaVersion 1 document, defaulted to [] on load.
    dicePresets: z.array(dicePresetSchema).max(20).optional().default([]),
    resourceCounters: z
      .array(resourceCounterSchema)
      .max(20)
      .optional()
      .default([]),
  })
  .strict();
