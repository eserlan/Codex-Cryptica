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
import {
  scenarioCollectionSchema,
  scenarioItemIdentityIds,
} from "./scenario-schemas";
import { migrateLegacyScenarioCollection } from "./scenario-migration";

export const MAX_SERIALIZED_STATE_CHARS = 32_000;
export const MAX_GENERATION_INPUT_CHARS = 96_000;
export const MAX_TEXT_CHARS = 600;
export const CURRENT_ADVENTURE_SCHEMA_VERSION = 3;

const text = z.string().trim().min(1).max(MAX_TEXT_CHARS);
const narration = z.string().trim().min(1).max(2_000);
const id = z.string().trim().min(1).max(160);
const timestamp = z.string().datetime({ offset: true });

const stateFactSchema = z.object({
  id,
  text,
  source: z.enum(["canonical", "provisional", "revealed-secret"]),
  sourceRecordId: id.optional(),
  placeId: id.optional(),
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
  scenarioId: id.optional(),
});
const newProvisionalFactSchema = provisionalFactSchema
  .omit({ id: true, introducedOnTurnId: true })
  .strict();

const rollTracePartSchema = z.object({
  type: z.enum(["dice", "modifier"]),
  value: z.number().finite(),
  sides: z.number().int().positive().optional(),
  rolls: z.array(z.number().finite()).max(200).optional(),
  dropped: z.array(z.number().finite()).max(200).optional(),
});

const outcomeSchema = z.object({
  kind: z.enum(["narrative", "numeric"]),
  value: z.union([z.string().max(MAX_TEXT_CHARS), z.number().finite()]),
  label: text.optional(),
  // The rolled dice behind `value`, when there was a real roll (#3443).
  parts: z.array(rollTracePartSchema).max(50).optional(),
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

const worldTimeEventSchema = z
  .object({
    id,
    turnId: id,
    atMinute: z.number().int().nonnegative(),
    threadId: id,
    text,
  })
  .strict();

const worldTimeSchema = z
  .object({
    version: z.literal(1),
    elapsedMinutes: z.number().int().min(0).max(52_560_000),
    events: z.array(worldTimeEventSchema).max(80),
  })
  .strict();

const timeAdvanceSchema = z
  .object({
    minutes: z.number().int().min(1).max(43_200),
    cause: text,
    developments: z.array(z.object({ threadId: id, text }).strict()).max(3),
  })
  .strict();

const scenarioElaborationProposalSchema = z
  .object({
    scenarioId: id,
    stage: z.enum(["hearsay", "actionable-clue", "revelation-crisis"]),
    discovery: text.optional(),
  })
  .strict();

export const MAX_STORY_SO_FAR_CHARS = 1_500;
const storySoFarSchema = z
  .object({
    text: z.string().trim().min(1).max(MAX_STORY_SO_FAR_CHARS),
    throughSequence: z.number().int().nonnegative(),
    updatedAt: timestamp,
  })
  .strict();

export const MAX_PLACES = 30;
export const MAX_PLACE_ALIASES = 5;
const MAX_PLACE_NAME_CHARS = 120;
const placeName = z.string().trim().min(1).max(MAX_PLACE_NAME_CHARS);

const placeSchema = z
  .object({
    id,
    name: placeName,
    sourceRecordId: id.optional(),
    relation: text.optional(),
    aliases: z.array(placeName).max(MAX_PLACE_ALIASES).optional(),
  })
  .strict();

const placeMoveSchema = z
  .object({
    placeId: id.optional(),
    name: placeName.optional(),
    relation: text.optional(),
  })
  .strict()
  .refine((move) => Boolean(move.placeId || move.name), {
    message: "A move needs a placeId or a name.",
  });

const completeProposalSchema = z.object({
  kind: z.literal("complete"),
  narration,
  timeAdvance: timeAdvanceSchema.optional(),
  moveTo: placeMoveSchema.optional(),
  visiblePatch: visiblePatchSchema,
  hiddenPatch: hiddenPatchSchema,
  revealSecretIds: z.array(id),
  revealScenarioIds: z.array(id).max(8).optional(),
  elaborateScenarios: z
    .array(scenarioElaborationProposalSchema)
    .max(8)
    .optional(),
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

export const scenarioEventSchema = z
  .object({
    id,
    kind: z.enum([
      "discovery",
      "consequence",
      "status-change",
      "theory",
      "stage-change",
    ]),
    visibility: z.enum(["player", "gm"]),
    text,
    at: timestamp,
    turnId: id.optional(),
    causedBy: z
      .object({ scenarioId: id, eventId: id, anchorRef: id })
      .strict()
      .optional(),
  })
  .strict();

/** Optional, bounded world-entry setup. Old sessions remain compatible. */
const worldEntrySchema = z
  .object({
    version: z.literal(1),
    location: z.discriminatedUnion("kind", [
      z
        .object({ kind: z.literal("canonical"), recordId: id, name: text })
        .strict(),
      z.object({ kind: z.literal("provisional"), name: text }).strict(),
    ]),
    at: z
      .object({
        year: z.number().int().finite(),
        // Calendar-specific upper bounds belong to calendarEngine.isValid():
        // custom calendars may have 13+ months or 400-day months.
        month: z.number().int().min(1).optional(),
        day: z.number().int().min(1).optional(),
        precision: z.enum(["year", "unit", "day", "anchor"]).optional(),
        unitId: id.optional(),
        anchorId: id.optional(),
        calendarRevision: z.number().int().positive().optional(),
        label: z.string().max(MAX_TEXT_CHARS).optional(),
      })
      .strict()
      .optional(),
    intent: z.enum(["explore", "scene", "opportunity"]),
    scenePrompt: text.optional(),
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
    scenarioCollection: scenarioCollectionSchema.optional(),
    worldEntry: worldEntrySchema.optional(),
    worldTime: worldTimeSchema.optional(),
    places: z.array(placeSchema).max(MAX_PLACES).optional(),
    currentPlaceId: id.optional(),
    storySoFar: storySoFarSchema.optional(),
    visibleState: visibleStateSchema,
    hiddenState: hiddenStateSchema,
    provisionalFacts: z.array(provisionalFactSchema).max(60),
    dismissedProvisionalFactIds: z.array(id).max(60).optional().default([]),
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
        timeAdvance: timeAdvanceSchema
          .pick({ minutes: true, cause: true })
          .optional(),
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
  })
  .strict();

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
  2: (session) => migrateLegacyScenarioCollection(session),
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
  validateScenarioIdentitySpace(parsed as AdventureSession);
  const stateLength = JSON.stringify({
    visibleState: parsed.visibleState,
    hiddenState: parsed.hiddenState,
    provisionalFacts: parsed.provisionalFacts,
    dismissedProvisionalFactIds: parsed.dismissedProvisionalFactIds,
    scenarioCollection: parsed.scenarioCollection,
    worldEntry: parsed.worldEntry,
    worldTime: parsed.worldTime,
    places: parsed.places,
    storySoFar: parsed.storySoFar,
  }).length;
  if (stateLength > MAX_SERIALIZED_STATE_CHARS) {
    throw new Error("state-budget-exceeded");
  }
  return parsed as AdventureSession;
}

function validateScenarioIdentitySpace(session: AdventureSession): void {
  const collection = session.scenarioCollection;
  if (!collection) return;
  const occupiedIds = new Set([
    session.id,
    session.vaultId,
    ...session.visibleState.objectives.map((entry) => entry.id),
    ...session.visibleState.activeCharacters.map((entry) => entry.id),
    ...session.visibleState.knownFacts.map((entry) => entry.id),
    ...session.visibleState.relationships.map((entry) => entry.id),
    ...(session.visibleState.location
      ? [session.visibleState.location.id]
      : []),
    ...(session.visibleState.situation
      ? [session.visibleState.situation.id]
      : []),
    ...session.hiddenState.secrets.map((entry) => entry.id),
    ...session.hiddenState.gmThreads.map((entry) => entry.id),
    ...session.provisionalFacts.map((entry) => entry.id),
    ...session.turns.map((entry) => entry.id),
    ...(session.pendingRoll ? [session.pendingRoll.id] : []),
    ...session.dicePresets.map((entry) => entry.id),
    ...session.resourceCounters.map((entry) => entry.id),
    ...(session.worldTime?.events.map((entry) => entry.id) ?? []),
  ]);
  const scenarioIds = new Set<string>();
  for (const item of collection.items) {
    assertUniqueScenarioRecordIds(item, occupiedIds, scenarioIds);
    assertUniqueScenarioSecretBindings(item, session, occupiedIds, scenarioIds);
  }
}

type ScenarioCollectionItem = NonNullable<
  AdventureSession["scenarioCollection"]
>["items"][number];

function assertUniqueScenarioRecordIds(
  item: ScenarioCollectionItem,
  occupiedIds: Set<string>,
  scenarioIds: Set<string>,
): void {
  for (const id of [item.id, ...item.events.map((event) => event.id)]) {
    if (occupiedIds.has(id) || scenarioIds.has(id)) {
      throw new Error("scenario-id-collision");
    }
    scenarioIds.add(id);
  }
}

function assertUniqueScenarioSecretBindings(
  item: ScenarioCollectionItem,
  session: AdventureSession,
  occupiedIds: Set<string>,
  scenarioIds: Set<string>,
): void {
  const sourceText = new Map(scenarioSecretSourceText(item));
  const boundIds = scenarioItemIdentityIds(item).filter((id) =>
    sourceText.has(id),
  );
  for (const secretId of boundIds) {
    if (scenarioIds.has(secretId)) {
      throw new Error("scenario-secret-id-collision");
    }
    const registered = session.hiddenState.secrets.find(
      (entry) => entry.id === secretId,
    );
    if (registered) {
      if (
        normalizeIdentityText(registered.text) !==
        normalizeIdentityText(sourceText.get(secretId) ?? "")
      ) {
        throw new Error("scenario-secret-id-collision");
      }
    } else if (occupiedIds.has(secretId)) {
      throw new Error("scenario-secret-id-collision");
    }
    scenarioIds.add(secretId);
  }
}

function scenarioSecretSourceText(
  item: ScenarioCollectionItem,
): Array<[string, string]> {
  return [
    [item.secretBindings.truth, item.gmOnly.truth],
    ...(item.secretBindings.ifInvestigated
      ? [
          [
            item.secretBindings.ifInvestigated,
            item.gmOnly.ifInvestigated ?? "",
          ] as [string, string],
        ]
      : []),
    ...item.events.flatMap((event) => {
      const id = Object.hasOwn(item.secretBindings.eventIds, event.id)
        ? item.secretBindings.eventIds[event.id]
        : undefined;
      return event.visibility === "gm" && id
        ? [[id, event.text] as [string, string]]
        : [];
    }),
  ];
}

function normalizeIdentityText(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export type AdventureSessionReadResult =
  | { mode: "writable"; session: AdventureSession }
  | {
      mode: "legacy-read-only-recovery";
      session: AdventureSession;
      exportDocument: unknown;
      reason: "migration-budget-exceeded";
    };

/** Keep valid legacy bytes inspectable if only additive v3 metadata breaks the state ceiling. */
export function parseAdventureSessionForRecovery(
  input: unknown,
): AdventureSessionReadResult {
  try {
    return { mode: "writable", session: parseAdventureSession(input) };
  } catch (cause) {
    const version =
      input && typeof input === "object" && !Array.isArray(input)
        ? (input as Record<string, unknown>).schemaVersion
        : undefined;
    if (
      !(cause instanceof Error) ||
      cause.message !== "state-budget-exceeded" ||
      typeof version !== "number" ||
      version >= CURRENT_ADVENTURE_SCHEMA_VERSION
    )
      throw cause;
    const migrated = migrateAdventureSession(input);
    const parsed = adventureSessionSchema.parse(migrated) as AdventureSession;
    validateScenarioIdentitySpace(parsed);
    const original = input as Record<string, unknown>;
    const legacyStateLength = JSON.stringify({
      visibleState: parsed.visibleState,
      hiddenState: parsed.hiddenState,
      provisionalFacts: parsed.provisionalFacts,
      scenarioState: original.scenarioState,
      worldEntry: parsed.worldEntry,
      worldTime: parsed.worldTime,
    }).length;
    if (legacyStateLength > MAX_SERIALIZED_STATE_CHARS) throw cause;
    return {
      mode: "legacy-read-only-recovery",
      session: parsed,
      exportDocument: structuredClone(input),
      reason: "migration-budget-exceeded",
    };
  }
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
      dismissedProvisionalFactIds: session.dismissedProvisionalFactIds,
      scenarioCollection: session.scenarioCollection,
      worldEntry: session.worldEntry,
      worldTime: session.worldTime,
      places: session.places,
      storySoFar: session.storySoFar,
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
