import {
  createScenarioState,
  parseAdventureSession,
  type AdventureSession,
  type ResolvedSourceExcerpt,
} from "../../src";

export interface GmDirectorEvaluationFixtureStep {
  playerAction: string;
  relevant?: ResolvedSourceExcerpt[];
  expectsSubstantiveAnswer?: boolean;
  expectsActionableProgression?: boolean;
  expectsUsefulNegativeFinding?: boolean;
  quietOutcome?: "peaceful" | "exhausted";
  forbiddenNpcKnowledge?: string[];
  providerHistoryReset?: boolean;
}

const eddaExcerpt: ResolvedSourceExcerpt = {
  recordId: "witness-edda",
  displayName: "Edda Vale",
  role: "turn-source",
  content:
    "Bell-ringer Edda knows the bell's normal schedule and maintains its rope. The public watch ledger records scheduled repair tests. She has not been asked about the unusual noon stroke yet.",
};

const orenExcerpt: ResolvedSourceExcerpt = {
  recordId: "witness-oren",
  displayName: "Oren Pike",
  role: "turn-source",
  content:
    "Baker Oren heard one clear bell stroke from the market. He was serving customers and did not see who rang it or why. He knows the public watch ledger records scheduled bell tests and can direct a visitor to the archive.",
};

const archiveExcerpt: ResolvedSourceExcerpt = {
  recordId: "record-watch-ledger",
  displayName: "Northbrook Watch Ledger",
  role: "turn-source",
  content:
    "The ordinary watch ledger records a scheduled clapper test at noon. It records no alarm, break-in, injury, or emergency call.",
};

export const GM_DIRECTOR_EVALUATION_FIXTURE = {
  title: "The Northbrook Bell",
  premise: "A single bell stroke sounded at noon, outside its usual schedule.",
  immutableTruth:
    "There was no alarm or intruder. Edda tested a repaired clapper at the watch's scheduled request and forgot to announce the test.",
  witnesses: [
    {
      id: "witness-edda",
      name: "Edda Vale",
      knows: "She tested the repaired clapper at the watch's request.",
      limit: "She does not know what Oren heard from inside the bakery.",
    },
    {
      id: "witness-oren",
      name: "Oren Pike",
      knows: "He heard one clear stroke while serving customers.",
      limit: "He did not see the ringer and cannot identify the reason.",
    },
    {
      id: "witness-watch-clerk",
      name: "Clerk Sella",
      knows: "The noon clapper test was scheduled; no alarm was recorded.",
      limit:
        "She was not present at the tower and cannot say who performed it.",
    },
  ],
  clues: [
    "The bell rope is intact, with no sign of force or tampering.",
    "The watch ledger records a scheduled noon clapper test and no alarm.",
  ],
  fairNegativeFinding:
    "The rope and latch are undisturbed; there is no evidence of forced entry.",
  peacefulRoute:
    "The player may ignore the bell and help at the market without a new crisis or forced objective.",
} as const;

export const GM_DIRECTOR_EVALUATION_STEPS: GmDirectorEvaluationFixtureStep[] = [
  {
    playerAction:
      "Ask Edda what the bell's normal schedule is and how the watch records repairs.",
    relevant: [eddaExcerpt],
    expectsSubstantiveAnswer: true,
  },
  {
    playerAction: "Ask Edda why one stroke sounded outside the usual schedule.",
    relevant: [eddaExcerpt],
    expectsSubstantiveAnswer: true,
    expectsActionableProgression: true,
  },
  {
    playerAction:
      "Ask Oren whether anyone else was near the bell tower and where to check the test schedule.",
    relevant: [orenExcerpt],
    expectsSubstantiveAnswer: true,
    expectsActionableProgression: true,
    forbiddenNpcKnowledge: [
      "Edda tested the repaired clapper at the watch's scheduled request",
    ],
  },
  {
    playerAction: "Inspect the bell rope and latch for signs of tampering.",
    relevant: [
      {
        recordId: "bell-tower",
        displayName: "Northbrook Bell Tower",
        role: "anchor",
        content:
          "From the tower landing, the bell rope is intact with no fraying or cut strands, and the outer latch has no fresh damage or pry marks. The visible evidence gives no sign of forced entry or tampering.",
      },
    ],
    expectsUsefulNegativeFinding: true,
  },
  {
    playerAction: "Check the watch ledger for the noon bell entry.",
    relevant: [archiveExcerpt],
    expectsSubstantiveAnswer: true,
    expectsActionableProgression: true,
  },
  {
    playerAction: "Return to Edda and show her the ledger entry.",
    relevant: [eddaExcerpt, archiveExcerpt],
    expectsSubstantiveAnswer: true,
    expectsActionableProgression: true,
  },
  {
    playerAction:
      "Ignore the bell and spend the afternoon helping at the market.",
    quietOutcome: "peaceful",
  },
  {
    playerAction:
      "Reload from the last committed turn and read the archive repair note.",
    relevant: [archiveExcerpt],
    expectsSubstantiveAnswer: true,
    providerHistoryReset: true,
  },
];

export const GM_DIRECTOR_EVALUATION_ACTIONS = GM_DIRECTOR_EVALUATION_STEPS.map(
  (step) => step.playerAction,
);

export const GM_DIRECTOR_EVALUATION_SCORING_GUIDANCE = {
  progression: [
    "substantive-answer",
    "actionable-route",
    "useful-negative-finding",
    "causal-consistency",
    "committed-fact-reuse",
    "npc-knowledge-integrity",
    "agency-and-reversibility",
  ],
  validQuietOutcomes: ["peaceful-resolution", "credible-exhausted-trail"],
  failures: ["repeated-non-answer", "invented-clue", "forced-escalation"],
} as const;

export function createGmDirectorEvaluationSession(): AdventureSession {
  const scenario = {
    ...createScenarioState({
      id: "scenario-northbrook-bell",
      origin: { kind: "manual", manualId: "synthetic-bell-investigation" },
      playerVisible: {
        rumour:
          "A single bell stroke sounded at noon, outside its usual schedule.",
        lead: "Northbrook Bell Tower and the watch ledger",
        source: "Market callers",
      },
      gmOnly: { truth: GM_DIRECTOR_EVALUATION_FIXTURE.immutableTruth },
    }),
    knowledge: "heard" as const,
    anchorRefs: ["bell-tower", "record-watch-ledger"],
    revealedSecretIds: [],
    secretBindings: {
      truth: "secret-northbrook-bell-test",
      eventIds: {},
    },
  };

  return parseAdventureSession({
    schemaVersion: 3,
    id: "gm-director-evaluation-fixture",
    vaultId: "synthetic-evaluation-vault",
    title: GM_DIRECTOR_EVALUATION_FIXTURE.title,
    status: "active",
    createdAt: "2026-11-24T00:00:00.000Z",
    updatedAt: "2026-11-24T00:00:00.000Z",
    lastPlayedAt: "2026-11-24T00:00:00.000Z",
    revision: 0,
    playerCharacter: {
      kind: "provisional",
      name: "Mara",
      description: "A curious visitor who may pursue or ignore local rumours.",
    },
    premise: GM_DIRECTOR_EVALUATION_FIXTURE.premise,
    sourceRecords: [
      {
        recordId: "player-mara",
        recordType: "character",
        displayName: "Mara",
        role: "player-character",
        availability: "available",
      },
      {
        recordId: "bell-tower",
        recordType: "location",
        displayName: "Northbrook Bell Tower",
        role: "anchor",
        availability: "available",
      },
      {
        recordId: "witness-edda",
        recordType: "character",
        displayName: "Edda Vale",
        role: "turn-source",
        availability: "available",
      },
      {
        recordId: "witness-oren",
        recordType: "character",
        displayName: "Oren Pike",
        role: "turn-source",
        availability: "available",
      },
      {
        recordId: "record-watch-ledger",
        recordType: "note",
        displayName: "Northbrook Watch Ledger",
        role: "turn-source",
        availability: "available",
      },
    ],
    places: [
      { id: "place-northbrook-market", name: "Northbrook Market" },
      { id: "place-bell-tower", name: "Northbrook Bell Tower" },
      { id: "place-watch-archive", name: "Northbrook Watch Archive" },
    ],
    currentPlaceId: "place-northbrook-market",
    scenarioCollection: {
      version: 1,
      focusedScenarioId: scenario.id,
      items: [scenario],
    },
    worldTime: { version: 1, elapsedMinutes: 0, events: [] },
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [
        {
          id: "secret-northbrook-bell-test",
          text: GM_DIRECTOR_EVALUATION_FIXTURE.immutableTruth,
          status: "hidden",
        },
      ],
      gmThreads: [],
    },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
  });
}
