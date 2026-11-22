import { z } from "zod";
import { id, text, timestamp } from "./schema-primitives";
import type {
  AdventureSession,
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
  adventureSessionSchema,
  CURRENT_ADVENTURE_SCHEMA_VERSION,
} from "./session-schema";
import { scenarioItemIdentityIds } from "./scenario-schemas";
import { migrateLegacyScenarioCollection } from "./scenario-migration";
import { migrateHistoricalAnchor } from "./historical-anchor-schemas";

export { MAX_TEXT_CHARS } from "./schema-primitives";
export {
  MAX_PACKAGE_PROGRESS_ENTRIES,
  MAX_ACTOR_REMEMBERED_FACTS,
  MAX_ACTOR_FACT_CHARS,
} from "./package-progress-schemas";
export { visiblePatchSchema, hiddenPatchSchema } from "./state-schemas";
export {
  MAX_STORY_SO_FAR_CHARS,
  MAX_OOC_EXCHANGES,
  CURRENT_ADVENTURE_SCHEMA_VERSION,
  adventureSessionSchema,
} from "./session-schema";
export { MAX_PLACES, MAX_PLACE_ALIASES } from "./place-schemas";
export { turnProposalSchema, parseTurnProposal } from "./turn-schemas";

export const MAX_SERIALIZED_STATE_CHARS = 32_000;
export const MAX_GENERATION_INPUT_CHARS = 96_000;

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
  if (session.historicalAnchor !== undefined) {
    session.historicalAnchor = migrateHistoricalAnchor(
      session.historicalAnchor,
    );
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
    historicalAnchor: parsed.historicalAnchor,
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
    ...(session.oocExchanges?.map((entry) => entry.id) ?? []),
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

export function validateStateBudget(session: AdventureSession): boolean {
  return (
    JSON.stringify({
      visibleState: session.visibleState,
      hiddenState: session.hiddenState,
      provisionalFacts: session.provisionalFacts,
      dismissedProvisionalFactIds: session.dismissedProvisionalFactIds,
      scenarioCollection: session.scenarioCollection,
      worldEntry: session.worldEntry,
      historicalAnchor: session.historicalAnchor,
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
