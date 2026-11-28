import type { AdventureSession } from "@codex/adventure-engine";

export function exampleSession(): AdventureSession {
  return {
    schemaVersion: 3,
    id: "session-1",
    vaultId: "vault-1",
    title: "The Quiet Village",
    premise: "Begin with a peaceful market day",
    revision: 2,
    status: "active",
    createdAt: "2026-11-11T10:00:00.000Z",
    updatedAt: "2026-11-11T10:05:00.000Z",
    lastPlayedAt: "2026-11-11T10:05:00.000Z",
    playerCharacter: { kind: "provisional", name: "Mara", description: "" },
    sourceRecords: [],
    worldEntry: {
      version: 1,
      location: { kind: "provisional", name: "Northbrook" },
      intent: "explore",
    },
    visibleState: {
      location: { id: "loc-1", source: "provisional", text: "Northbrook" },
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [
        { id: "secret-1", text: "The miller is missing.", status: "hidden" },
      ],
      gmThreads: [
        { id: "thread-1", text: "A caravan is approaching.", status: "hidden" },
      ],
    },
    scenarioCollection: {
      version: 1,
      focusedScenarioId: null,
      items: [
        {
          version: 1,
          id: "scenario-1",
          status: "open",
          stage: "hearsay",
          knowledge: "unheard",
          anchorRefs: [],
          origin: { kind: "rumour" },
          playerVisible: { rumour: "A missing sack.", lead: "The mill." },
          gmOnly: { truth: "The grain was spoiled by a leaky roof." },
          events: [
            {
              id: "event-1",
              kind: "consequence",
              visibility: "gm",
              text: "The merchant secretly destroyed the stock.",
              at: "2026-11-11T10:05:00.000Z",
            },
          ],
          revealedSecretIds: [],
          secretBindings: { truth: "secret-1", eventIds: {} },
        },
      ],
    },
    worldTime: {
      version: 1,
      elapsedMinutes: 1440,
      events: [
        {
          id: "clock-event",
          turnId: "turn-1",
          atMinute: 1440,
          threadId: "thread-1",
          text: "The caravan moved overnight.",
        },
      ],
    },
    provisionalFacts: [
      {
        id: "fact-1",
        kind: "person",
        name: "The baker",
        summary: "Bakes bread.",
        introducedOnTurnId: "turn-1",
        visibility: "player-visible",
      },
    ],
    turns: [
      {
        id: "turn-1",
        inputId: "input-1",
        sequence: 0,
        playerAction: "Ask the baker about local news.",
        narration: "The baker says the market is quiet.",
        visiblePatch: {
          objectives: { add: [], update: [], removeIds: [] },
          activeCharacters: { add: [], update: [], removeIds: [] },
          knownFacts: { add: [], update: [], removeIds: [] },
          relationships: { add: [], update: [], removeIds: [] },
        },
        hiddenPatch: {
          secrets: { add: [], update: [], removeIds: [] },
          gmThreads: { add: [], update: [], removeIds: [] },
        },
        revealedSecretIds: [],
        sourceRecordIds: [],
        provisionalFactIds: ["fact-1"],
        timeAdvance: { minutes: 1440, cause: "Rested overnight" },
        suggestedActions: [
          "Visit the market",
          "Ask about the mill",
          "Leave town",
        ],
        committedAt: "2026-11-11T10:05:00.000Z",
      },
    ],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
  };
}

export function quietSession(turnCount: number): AdventureSession {
  const session = exampleSession();
  const template = session.turns[0];
  session.worldTime = undefined;
  session.provisionalFacts = [];
  session.turns = Array.from({ length: turnCount }, (_, sequence) => ({
    ...structuredClone(template),
    id: "turn-" + sequence,
    sequence,
    timeAdvance: undefined,
    provisionalFactIds: [],
  }));
  return session;
}
