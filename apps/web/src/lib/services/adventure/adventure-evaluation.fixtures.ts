import {
  createScenarioState,
  parseAdventureSession,
  type AdventureSession,
  type AdventureTurnProposal,
  type EvaluationTurn,
} from "@codex/adventure-engine";

export const now = "2026-11-10T10:00:00.000Z";

export const emptyVisible = {
  objectives: { add: [], update: [], removeIds: [] },
  activeCharacters: { add: [], update: [], removeIds: [] },
  knownFacts: { add: [], update: [], removeIds: [] },
  relationships: { add: [], update: [], removeIds: [] },
};

const emptyHidden = {
  secrets: { add: [], update: [], removeIds: [] },
  gmThreads: { add: [], update: [], removeIds: [] },
};

export function completeProposal(
  overrides: Partial<Extract<AdventureTurnProposal, { kind: "complete" }>> = {},
): Extract<AdventureTurnProposal, { kind: "complete" }> {
  return {
    kind: "complete",
    narration: "A quiet breeze moves across the market square.",
    visiblePatch: emptyVisible,
    hiddenPatch: emptyHidden,
    revealSecretIds: [],
    provisionalFacts: [],
    sourceRecordIds: [],
    ...overrides,
  };
}

export function makeSession(): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 3,
    id: "eval-session-1",
    vaultId: "vault-1",
    title: "Market Square",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 0,
    playerCharacter: { kind: "canonical", recordId: "pc-1", name: "Kestrel" },
    premise: "Evening in Oakhaven.",
    sourceRecords: [
      {
        recordId: "pc-1",
        recordType: "character",
        displayName: "Kestrel",
        role: "player-character",
        availability: "available",
      },
      {
        recordId: "loc-1",
        recordType: "location",
        displayName: "Oakhaven Market",
        role: "anchor",
        availability: "available",
      },
    ],
    places: [
      { id: "place-1", name: "Oakhaven Market", sourceRecordId: "loc-1" },
    ],
    currentPlaceId: "place-1",
    scenarioCollection: {
      version: 1,
      focusedScenarioId: null,
      items: [
        {
          ...createScenarioState({
            id: "scen-1",
            origin: { kind: "manual", manualId: "m-1" },
            playerVisible: {
              rumour: "The baker's cart arrived late.",
              lead: "South Gate",
            },
            gmOnly: { truth: "Bandits demanded a toll at the ford." },
          }),
          knowledge: "heard",
          anchorRefs: ["loc-1"],
          revealedSecretIds: [],
          secretBindings: { truth: "truth-1", eventIds: {} },
        },
      ],
    },
    worldTime: { version: 1, elapsedMinutes: 0, events: [] },
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [{ id: "sec-1", text: "CANARY-TOLL-COIN", status: "hidden" }],
      gmThreads: [
        { id: "thread-1", text: "South Gate watch", status: "hidden" },
      ],
    },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
  });
}

export function makeEvaluation(
  overrides: Partial<EvaluationTurn> = {},
): EvaluationTurn {
  const session = makeSession();
  const proposal = completeProposal();
  return {
    narration: proposal.narration,
    proposal,
    playerCharacterName: "Kestrel",
    playerAction: "Check the watch ledger.",
    previousSession: session,
    session,
    canaries: [],
    ...overrides,
  };
}
