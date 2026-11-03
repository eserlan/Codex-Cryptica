import type {
  AdventureSession,
  PlayerCharacter,
  ScenarioState,
  WorldEntryContext,
} from "@codex/adventure-engine";

/** An opening is committed once it has a turn or a pending opening roll. */
export function hasCommittedOpening(
  session: AdventureSession | null | undefined,
): boolean {
  return Boolean(session && (session.turns.length > 0 || session.pendingRoll));
}

export function initialSession(input: {
  vaultId: string;
  title: string;
  premise: string;
  playerCharacter: PlayerCharacter;
  sourceRecords?: AdventureSession["sourceRecords"];
  scenarioSeed?: ScenarioState;
  worldEntry?: WorldEntryContext;
  now: string;
  idGenerator: () => string;
}): AdventureSession {
  return {
    schemaVersion: 2,
    id: input.idGenerator(),
    vaultId: input.vaultId,
    title: input.title,
    status: "active",
    createdAt: input.now,
    updatedAt: input.now,
    lastPlayedAt: input.now,
    revision: 0,
    playerCharacter: input.playerCharacter,
    premise: input.premise,
    sourceRecords: input.sourceRecords ?? [],
    ...(input.scenarioSeed
      ? { scenarioState: structuredClone(input.scenarioSeed) }
      : {}),
    ...(input.worldEntry
      ? { worldEntry: structuredClone(input.worldEntry) }
      : {}),
    visibleState: {
      ...(input.worldEntry
        ? {
            location: {
              id: input.idGenerator(),
              text: input.worldEntry.location.name,
              source:
                input.worldEntry.location.kind === "canonical"
                  ? ("canonical" as const)
                  : ("provisional" as const),
              ...(input.worldEntry.location.kind === "canonical"
                ? { sourceRecordId: input.worldEntry.location.recordId }
                : {}),
            },
          }
        : {}),
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: input.scenarioSeed
        ? [
            {
              id: input.idGenerator(),
              text: input.scenarioSeed.gmOnly.truth,
              status: "hidden",
              revealCondition: "Reveal after in-world discovery.",
            },
          ]
        : [],
      gmThreads: [],
    },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
  };
}
