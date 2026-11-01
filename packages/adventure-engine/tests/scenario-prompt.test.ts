import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  createScenarioState,
  detectHiddenLeakage,
  parseAdventureSession,
} from "../src";
import type { AdventureSession, AdventureTurnProposal } from "../src";

const now = "2026-11-01T11:00:00.000Z";
const truth = "The miller has hidden grain beneath the waterwheel.";

function session(): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 2,
    id: "adventure-1",
    vaultId: "vault-1",
    title: "Northbrook",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 0,
    playerCharacter: {
      kind: "provisional",
      name: "Kael",
      description: "Traveler",
    },
    premise: "The miller has vanished.",
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
    scenarioState: createScenarioState({
      id: "rumour-4",
      origin: { kind: "rumour", batchTitle: "Northbrook", index: 4 },
      playerVisible: {
        rumour: "The miller has vanished.",
        lead: "Old Mill",
        source: "Innkeeper",
      },
      gmOnly: { truth },
    }),
  });
}

function proposal(
  narration: string,
  revealSecretIds: string[] = [],
): AdventureTurnProposal {
  return {
    kind: "complete",
    narration,
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
    revealSecretIds,
    provisionalFacts: [],
    sourceRecordIds: [],
  };
}

describe("scenario-aware Oracle GM", () => {
  it("separates the public scenario from immutable GM truth in the prompt state", () => {
    const prompt = buildAdventurePrompt({
      session: session(),
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    const state = JSON.parse(prompt.state);
    expect(state.playerScenario.playerVisible.lead).toBe("Old Mill");
    expect(JSON.stringify(state.playerScenario)).not.toContain(truth);
    expect(state["GM-ONLY scenario"].baselineTruth.truth).toBe(truth);
    expect(prompt.behavior).toContain("Never rewrite");
    expect(prompt.behavior).toContain("not need to become an adventure");
    expect(prompt.behavior).toContain("ignore, abandon, revisit or resolve");
  });

  it("rejects unrevealed baseline truth even without a duplicate secret record", () => {
    const findings = detectHiddenLeakage(session(), proposal(truth));
    expect(findings).toEqual([
      { field: "root.narration", secretId: "scenario-baseline-truth" },
    ]);
  });

  it("permits explicit reveal of the baseline through the existing secret lifecycle", () => {
    const withSecret = session();
    withSecret.hiddenState.secrets.push({
      id: "truth-1",
      text: truth,
      status: "hidden",
    });
    expect(
      detectHiddenLeakage(withSecret, proposal(truth, ["truth-1"])),
    ).toEqual([]);
  });

  it("does not change the prompt for an ordinary premise-only adventure", () => {
    const { scenarioState: _scenarioState, ...ordinary } = session();
    const prompt = buildAdventurePrompt({
      session: ordinary,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    const state = JSON.parse(prompt.state);
    expect(state.playerScenario).toBeUndefined();
    expect(state["GM-ONLY scenario"]).toBeUndefined();
    expect(prompt.behavior).not.toContain("A rumour may be exaggerated");
  });
});
