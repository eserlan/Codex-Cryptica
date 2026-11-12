import { parseAdventureSession } from "@codex/adventure-engine";

export const session = parseAdventureSession({
  schemaVersion: 1 as const,
  id: "session-1",
  vaultId: "vault-1",
  title: "Road",
  status: "active" as const,
  createdAt: "2026-08-16T12:00:00.000Z",
  updatedAt: "2026-08-16T12:00:00.000Z",
  lastPlayedAt: "2026-08-16T12:00:00.000Z",
  revision: 0,
  playerCharacter: {
    kind: "provisional" as const,
    name: "Mara",
    description: "Guide",
  },
  premise: "Find the road",
  sourceRecords: [],
  visibleState: {
    objectives: [],
    activeCharacters: [],
    knownFacts: [],
    relationships: [],
  },
  hiddenState: { secrets: [], gmThreads: [] },
  provisionalFacts: [],
  turns: [],
  pendingRoll: null,
  dicePresets: [],
  resourceCounters: [],
});

export const completeResponse = JSON.stringify({
  kind: "complete",
  narration: "The road opens.",
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
  revealSecretIds: [],
  provisionalFacts: [],
  sourceRecordIds: [],
});
