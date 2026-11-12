import {
  applyCompletedTurn,
  applyRollRequest,
  seedPlaces,
} from "@codex/adventure-engine";
import type { CommitMetadata } from "@codex/adventure-engine";
import { diceParser } from "dice-engine";
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
  const session: AdventureSession = {
    schemaVersion: 3,
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
      ? {
          scenarioCollection: {
            version: 1 as const,
            items: [
              {
                ...structuredClone(input.scenarioSeed),
                knowledge: "heard" as const,
                anchorRefs: [],
                revealedSecretIds: [],
                secretBindings: {
                  truth: input.idGenerator(),
                  ...(input.scenarioSeed.gmOnly.ifInvestigated
                    ? { ifInvestigated: input.idGenerator() }
                    : {}),
                  eventIds: {},
                },
              },
            ],
            focusedScenarioId: input.scenarioSeed.id,
          },
        }
      : {}),
    ...(input.worldEntry
      ? { worldEntry: structuredClone(input.worldEntry) }
      : {}),
    visibleState: initialVisibleState(input.worldEntry, input.idGenerator),
    hiddenState: initialHiddenState(input.scenarioSeed, input.idGenerator),
    provisionalFacts: [],
    dismissedProvisionalFactIds: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
  };
  // Last, so the ids drawn for everything else keep their order.
  return { ...session, ...seedPlaces(session, input.idGenerator) };
}

export function validateRollExpression(proposal: {
  kind: string;
  dice?: { expression: string };
}): void {
  if (proposal.kind === "roll-required" && proposal.dice) {
    diceParser.parse(proposal.dice.expression);
  }
}

/** All reducers share this discriminated success/error contract. */
export function acceptedSession(
  result: {
    ok: boolean;
    value?: AdventureSession;
    errors?: { message: string }[];
  },
  fallback: string,
): AdventureSession {
  if (result.ok && result.value) return result.value;
  throw new Error(result.errors?.[0]?.message ?? fallback);
}

export function proposedSession(
  session: AdventureSession,
  proposal:
    | Parameters<typeof applyCompletedTurn>[1]
    | Parameters<typeof applyRollRequest>[1],
  meta: CommitMetadata,
  errorLabel: string,
): AdventureSession {
  const result =
    proposal.kind === "roll-required"
      ? applyRollRequest(session, proposal, meta)
      : applyCompletedTurn(session, proposal, meta);
  return acceptedSession(result, errorLabel);
}

function initialVisibleState(
  worldEntry: WorldEntryContext | undefined,
  idGenerator: () => string,
): AdventureSession["visibleState"] {
  return {
    ...(worldEntry
      ? {
          location: {
            id: idGenerator(),
            text: worldEntry.location.name,
            source:
              worldEntry.location.kind === "canonical"
                ? ("canonical" as const)
                : ("provisional" as const),
            ...(worldEntry.location.kind === "canonical"
              ? { sourceRecordId: worldEntry.location.recordId }
              : {}),
          },
        }
      : {}),
    objectives: [],
    activeCharacters: [],
    knownFacts: [],
    relationships: [],
  };
}

function initialHiddenState(
  _scenarioSeed: ScenarioState | undefined,
  _idGenerator: () => string,
): AdventureSession["hiddenState"] {
  return {
    secrets: [],
    gmThreads: [],
  };
}
