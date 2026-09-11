import { z } from "zod";
import type {
  AdventureSession,
  AdventureTurnProposal,
  DicePreset,
  HiddenStatePatch,
  OutcomeBand,
  ProvisionalFact,
  ResolvedRollSnapshot,
  ResourceCounter,
  SuppliedRollOutcome,
  VisibleStatePatch,
} from "./types";

export const MAX_SERIALIZED_STATE_CHARS = 32_000;
export const MAX_GENERATION_INPUT_CHARS = 96_000;
export const MAX_TEXT_CHARS = 600;
export const CURRENT_ADVENTURE_SCHEMA_VERSION = 2;

const text = z.string().trim().min(1).max(MAX_TEXT_CHARS);
const narration = z.string().trim().min(1).max(2_000);
const id = z.string().trim().min(1).max(160);
const timestamp = z.string().datetime({ offset: true });

const stateFactSchema = z.object({
  id,
  text,
  source: z.enum(["canonical", "provisional", "revealed-secret"]),
  sourceRecordId: id.optional(),
});
const newStateFactSchema = stateFactSchema.omit({ id: true }).strict();

const relationshipSchema = stateFactSchema.extend({
  subjectId: id,
  disposition: text,
});
const newRelationshipSchema = relationshipSchema.omit({ id: true }).strict();

const visibleStateSchema = z.object({
  location: stateFactSchema.optional(),
  situation: stateFactSchema.optional(),
  objectives: z.array(stateFactSchema).max(20),
  activeCharacters: z.array(stateFactSchema).max(30),
  knownFacts: z.array(stateFactSchema).max(60),
  relationships: z.array(relationshipSchema).max(40),
});

const hiddenSecretSchema = z.object({
  id,
  text,
  revealCondition: text.optional(),
  status: z.enum(["hidden", "revealed"]),
  revealedOnTurnId: id.optional(),
});
const newHiddenSecretSchema = hiddenSecretSchema
  .omit({ id: true, revealedOnTurnId: true })
  .strict();

const hiddenThreadSchema = z.object({
  id,
  text,
  status: z.enum(["hidden", "revealed"]),
  revealCondition: text.optional(),
});
const newHiddenThreadSchema = hiddenThreadSchema.omit({ id: true }).strict();

const hiddenStateSchema = z.object({
  secrets: z.array(hiddenSecretSchema).max(60),
  gmThreads: z.array(hiddenThreadSchema).max(40),
});

const sourceSchema = z.object({
  recordId: id,
  recordType: text,
  displayName: text,
  role: z.enum(["player-character", "anchor", "turn-source"]),
  availability: z.enum(["available", "unavailable"]),
  lastResolvedAt: timestamp.optional(),
});

const provisionalFactSchema = z.object({
  id,
  kind: z.enum([
    "person",
    "place",
    "faction",
    "item",
    "event",
    "clue",
    "other",
  ]),
  name: text,
  summary: text,
  introducedOnTurnId: id,
  visibility: z.enum(["player-visible", "gm-only"]),
});
const newProvisionalFactSchema = provisionalFactSchema
  .omit({ id: true, introducedOnTurnId: true })
  .strict();

const outcomeSchema = z.object({
  kind: z.enum(["narrative", "numeric"]),
  value: z.union([z.string().max(MAX_TEXT_CHARS), z.number().finite()]),
  label: text.optional(),
});

const bandSchema = z.object({
  id,
  label: text,
  minimum: z.number().finite().optional(),
  maximum: z.number().finite().optional(),
});

const resolvedRollSchema = z.object({
  expression: text.optional(),
  bands: z.array(bandSchema).min(1).max(12).optional(),
  outcome: outcomeSchema,
});

const dicePresetSchema = z.object({
  id,
  label: text,
  expression: text,
  createdAt: timestamp,
});

const resourceCounterSchema = z.object({
  id,
  label: text,
  value: z.number().finite(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const pendingRollSchema = z.object({
  id,
  inputId: id,
  // Opening rolls have no player action yet; action-turn rolls still carry it.
  playerAction: z.string().max(MAX_TEXT_CHARS),
  setupNarration: narration.optional(),
  uncertainty: text,
  stakes: text,
  dice: z
    .object({ expression: text, bands: z.array(bandSchema).min(1).max(12) })
    .optional(),
  resolutionStatus: z.enum(["awaiting-outcome", "ready-to-resolve"]),
  suppliedOutcome: outcomeSchema.optional(),
  createdAt: timestamp,
  outcomeRecordedAt: timestamp.optional(),
  suggestedActions: z.array(text).length(3).optional(),
});

const playerCharacterSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("canonical"), recordId: id, name: text }),
  z.object({ kind: z.literal("provisional"), name: text, description: text }),
]);

const collectionPatch = <TAdd extends z.ZodType, TUpdate extends z.ZodType>(
  addSchema: TAdd,
  updateSchema: TUpdate,
) =>
  z.object({
    add: z.array(addSchema),
    update: z.array(updateSchema),
    removeIds: z.array(id),
  });

export const visiblePatchSchema = z.object({
  location: newStateFactSchema.nullable().optional(),
  situation: newStateFactSchema.nullable().optional(),
  objectives: collectionPatch(newStateFactSchema, stateFactSchema),
  activeCharacters: collectionPatch(newStateFactSchema, stateFactSchema),
  knownFacts: collectionPatch(newStateFactSchema, stateFactSchema),
  relationships: collectionPatch(newRelationshipSchema, relationshipSchema),
});

export const hiddenPatchSchema = z.object({
  secrets: collectionPatch(newHiddenSecretSchema, hiddenSecretSchema),
  gmThreads: collectionPatch(newHiddenThreadSchema, hiddenThreadSchema),
});

// Committed turns are durable history, not model proposals. Their additions
// already have reducer-assigned IDs and must remain readable across schema
// changes.
const persistedCollectionPatch = <T extends z.ZodType>(schema: T) =>
  collectionPatch(schema, schema);

const persistedVisiblePatchSchema = z.object({
  location: stateFactSchema.nullable().optional(),
  situation: stateFactSchema.nullable().optional(),
  objectives: persistedCollectionPatch(stateFactSchema),
  activeCharacters: persistedCollectionPatch(stateFactSchema),
  knownFacts: persistedCollectionPatch(stateFactSchema),
  relationships: persistedCollectionPatch(relationshipSchema),
});

const persistedHiddenPatchSchema = z.object({
  secrets: persistedCollectionPatch(hiddenSecretSchema),
  gmThreads: persistedCollectionPatch(hiddenThreadSchema),
});

const completeProposalSchema = z.object({
  kind: z.literal("complete"),
  narration,
  visiblePatch: visiblePatchSchema,
  hiddenPatch: hiddenPatchSchema,
  revealSecretIds: z.array(id),
  provisionalFacts: z.array(newProvisionalFactSchema),
  sourceRecordIds: z.array(id),
  suggestedActions: z.array(text).length(3).optional(),
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

export const adventureSessionSchema = z.object({
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
  visibleState: visibleStateSchema,
  hiddenState: hiddenStateSchema,
  provisionalFacts: z.array(provisionalFactSchema).max(60),
  turns: z.array(
    z.object({
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
      revealedSecretIds: z.array(id),
      sourceRecordIds: z.array(id),
      provisionalFactIds: z.array(id),
      committedAt: timestamp,
      suggestedActions: z.array(text).length(3).optional(),
    }),
  ),
  pendingRoll: pendingRollSchema.nullable(),
  // Phase 2, additive: absent on a schemaVersion 1 document, defaulted to [] on load.
  dicePresets: z.array(dicePresetSchema).max(20).optional().default([]),
  resourceCounters: z
    .array(resourceCounterSchema)
    .max(20)
    .optional()
    .default([]),
});

type RawAdventureSession = Record<string, unknown>;
type AdventureSessionMigration = (
  session: RawAdventureSession,
) => RawAdventureSession;

const sessionMigrations: Record<number, AdventureSessionMigration> = {
  1: (session) => ({
    ...session,
    schemaVersion: 2,
    dicePresets: session.dicePresets ?? [],
    resourceCounters: session.resourceCounters ?? [],
  }),
};

/**
 * Upgrades a durable session document without mutating the parsed JSON.
 * Unknown future versions are deliberately rejected rather than rewritten.
 */
export function migrateAdventureSession(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid-adventure-session");
  }
  let session = structuredClone(input) as RawAdventureSession;
  const initialVersion = session.schemaVersion;
  if (
    typeof initialVersion !== "number" ||
    !Number.isInteger(initialVersion) ||
    initialVersion < 1
  ) {
    throw new Error("invalid-adventure-session-version");
  }
  let version = initialVersion;
  while (version < CURRENT_ADVENTURE_SCHEMA_VERSION) {
    const migrate = sessionMigrations[version];
    if (!migrate) throw new Error("incompatible-version");
    session = migrate(session);
    const migratedVersion = session.schemaVersion;
    if (
      typeof migratedVersion !== "number" ||
      !Number.isInteger(migratedVersion)
    )
      throw new Error("incompatible-version");
    version = migratedVersion;
  }
  if (version !== CURRENT_ADVENTURE_SCHEMA_VERSION) {
    throw new Error("incompatible-version");
  }
  return session;
}

export function parseAdventureSession(input: unknown): AdventureSession {
  const parsed = adventureSessionSchema.parse(migrateAdventureSession(input));
  const stateLength = JSON.stringify({
    visibleState: parsed.visibleState,
    hiddenState: parsed.hiddenState,
    provisionalFacts: parsed.provisionalFacts,
  }).length;
  if (stateLength > MAX_SERIALIZED_STATE_CHARS) {
    throw new Error("state-budget-exceeded");
  }
  return parsed as AdventureSession;
}

export function parseTurnProposal(input: unknown): AdventureTurnProposal {
  return turnProposalSchema.parse(input) as AdventureTurnProposal;
}

export function validateStateBudget(session: AdventureSession): boolean {
  return (
    JSON.stringify({
      visibleState: session.visibleState,
      hiddenState: session.hiddenState,
      provisionalFacts: session.provisionalFacts,
    }).length <= MAX_SERIALIZED_STATE_CHARS
  );
}

export function validateGenerationBudget(input: string): boolean {
  return input.length <= MAX_GENERATION_INPUT_CHARS;
}

export type SchemaVisiblePatch = VisibleStatePatch;
export type SchemaHiddenPatch = HiddenStatePatch;
export type SchemaOutcome = SuppliedRollOutcome;
export type SchemaOutcomeBand = OutcomeBand;
export type SchemaProvisionalFact = ProvisionalFact;
export type SchemaResolvedRoll = ResolvedRollSnapshot;
export type SchemaDicePreset = DicePreset;
export type SchemaResourceCounter = ResourceCounter;
