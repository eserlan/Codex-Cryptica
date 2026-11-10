import { parseAdventureSession } from "../src/schemas";
import type {
  AdventureSession,
  CompletedTurnProposal,
  ScenarioItem,
  VisibleStatePatch,
  HiddenStatePatch,
} from "../src/types";

export const now = "2026-11-10T12:00:00.000Z";
export const meta = { turnId: "turn-1", inputId: "input-1", now };

export function session(): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 3,
    id: "session-1",
    vaultId: "vault-1",
    title: "The road",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 0,
    playerCharacter: {
      kind: "provisional",
      name: "Mara",
      description: "A guide",
    },
    premise: "Explore the road",
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
  });
}

export function proposal(): CompletedTurnProposal {
  return {
    kind: "complete",
    narration: "The road opens ahead.",
    visiblePatch: emptyVisiblePatch(),
    hiddenPatch: emptyHiddenPatch(),
    revealSecretIds: [],
    provisionalFacts: [],
    sourceRecordIds: [],
  };
}

export function scenario(): ScenarioItem {
  return {
    version: 1,
    id: "scenario-1",
    origin: { kind: "manual", manualId: "seed-1" },
    playerVisible: { rumour: "Lights on the road", lead: "The old mill" },
    gmOnly: {
      truth: "Smugglers signal from the mill",
      ifInvestigated: "Crates beneath the floor",
    },
    knowledge: "unheard",
    stage: "hearsay",
    status: "open",
    events: [],
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: {
      truth: "truth-1",
      ifInvestigated: "investigated-1",
      eventIds: {},
    },
  };
}

export function emptyVisiblePatch(): VisibleStatePatch {
  return {
    objectives: { add: [], update: [], removeIds: [] },
    activeCharacters: { add: [], update: [], removeIds: [] },
    knownFacts: { add: [], update: [], removeIds: [] },
    relationships: { add: [], update: [], removeIds: [] },
  };
}

export function emptyHiddenPatch(): HiddenStatePatch {
  return {
    secrets: { add: [], update: [], removeIds: [] },
    gmThreads: { add: [], update: [], removeIds: [] },
  };
}
