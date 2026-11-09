import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  parseAdventureSession,
  createScenarioState,
  type AdventureSession,
  type ScenarioItem,
} from "../src";

const now = "2026-11-09T12:00:00.000Z";

const emptyPatch = () => ({
  objectives: { add: [], update: [], removeIds: [] },
  activeCharacters: { add: [], update: [], removeIds: [] },
  knownFacts: { add: [], update: [], removeIds: [] },
  relationships: { add: [], update: [], removeIds: [] },
});

const emptyHiddenPatch = () => ({
  secrets: { add: [], update: [], removeIds: [] },
  gmThreads: { add: [], update: [], removeIds: [] },
});

function createTestScenario(
  id: string,
  knowledge: ScenarioItem["knowledge"] = "heard",
  stage: ScenarioItem["stage"] = "hearsay",
): ScenarioItem {
  return {
    ...createScenarioState({
      id,
      origin: {
        kind: "rumour",
        batchTitle: "Blackwood Valley",
        batchId: `batch-${id}`,
        index: 1,
      },
      playerVisible: {
        rumour: "Odd lights near the barrow.",
        lead: "The Barrowfield at midnight.",
      },
      gmOnly: {
        truth: "Smugglers are signalling with coloured lanterns.",
        ifInvestigated: "Crates hidden in the false crypt.",
      },
    }),
    knowledge,
    stage,
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: {
      truth: `secret-${id}-truth`,
      ifInvestigated: `secret-${id}-investigated`,
      eventIds: {},
    },
  };
}

function createSession(
  scenarios: ScenarioItem[] = [],
  sources: AdventureSession["sourceRecords"] = [],
  provisionalFacts: AdventureSession["provisionalFacts"] = [],
): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 3,
    id: "session-test",
    vaultId: "vault-test",
    title: "Blackwood Mystery",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 1,
    playerCharacter: {
      kind: "provisional",
      name: "Rowan",
      description: "An inquisitive woodsman",
    },
    premise: "Strange lights have been reported.",
    sourceRecords: sources,
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: { secrets: [], gmThreads: [] },
    provisionalFacts,
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
    scenarioCollection: {
      version: 1,
      items: scenarios,
      focusedScenarioId: scenarios[0]?.id ?? null,
    },
  });
}

describe("progressive scenario elaboration ladder", () => {
  it("defaults scenario stage to hearsay for newly parsed scenarios", () => {
    const scenario = createTestScenario("scen-1");
    // Ensure default stage is "hearsay"
    expect(scenario.stage).toBe("hearsay");
    const session = createSession([scenario]);
    expect(session.scenarioCollection?.items[0]?.stage).toBe("hearsay");
  });

  it("escalates an investigated scenario from hearsay to actionable-clue", () => {
    const session = createSession([
      createTestScenario("scen-1", "heard", "hearsay"),
    ]);
    const result = applyCompletedTurn(
      session,
      {
        kind: "complete",
        narration:
          "You speak with the old shepherd, who saw tracks leading to the abandoned chapel.",
        visiblePatch: emptyPatch(),
        hiddenPatch: emptyHiddenPatch(),
        revealSecretIds: [],
        provisionalFacts: [
          {
            kind: "person",
            name: "Barnaby the Shepherd",
            summary:
              "An old shepherd who observed suspicious nocturnal tracks.",
            visibility: "player-visible",
            scenarioId: "scen-1",
          },
        ],
        sourceRecordIds: [],
        elaborateScenarios: [
          {
            scenarioId: "scen-1",
            stage: "actionable-clue",
            discovery: "Tracks lead towards the abandoned chapel.",
          },
        ],
      },
      { turnId: "turn-1", inputId: "input-1", now },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const updated = result.value.scenarioCollection?.items[0];
    expect(updated?.stage).toBe("actionable-clue");
    expect(
      updated?.events.some((e) => e.text.includes("Tracks lead towards")),
    ).toBe(true);

    // Materialised provisional fact
    expect(result.value.provisionalFacts).toHaveLength(1);
    expect(result.value.provisionalFacts[0]?.name).toBe("Barnaby the Shepherd");
    expect(result.value.provisionalFacts[0]?.scenarioId).toBe("scen-1");
  });

  it("escalates from actionable-clue to revelation-crisis", () => {
    const session = createSession([
      createTestScenario("scen-1", "heard", "actionable-clue"),
    ]);
    const result = applyCompletedTurn(
      session,
      {
        kind: "complete",
        narration:
          "In the chapel crypt, you discover lantern signals and a stash of illegal contraband.",
        visiblePatch: emptyPatch(),
        hiddenPatch: emptyHiddenPatch(),
        revealSecretIds: ["secret-scen-1-investigated"],
        provisionalFacts: [
          {
            kind: "place",
            name: "Chapel Crypt",
            summary: "A subterranean chamber used by smugglers.",
            visibility: "player-visible",
            scenarioId: "scen-1",
          },
        ],
        sourceRecordIds: [],
        elaborateScenarios: [
          {
            scenarioId: "scen-1",
            stage: "revelation-crisis",
            discovery: "Smuggler signalling station exposed in the crypt.",
          },
        ],
      },
      { turnId: "turn-2", inputId: "input-2", now },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const updated = result.value.scenarioCollection?.items[0];
    expect(updated?.stage).toBe("revelation-crisis");
  });

  it("rejects multi-step leaps (e.g. hearsay directly to revelation-crisis)", () => {
    const session = createSession([
      createTestScenario("scen-1", "heard", "hearsay"),
    ]);
    const result = applyCompletedTurn(
      session,
      {
        kind: "complete",
        narration: "A sudden crisis unfolds.",
        visiblePatch: emptyPatch(),
        hiddenPatch: emptyHiddenPatch(),
        revealSecretIds: [],
        provisionalFacts: [],
        sourceRecordIds: [],
        elaborateScenarios: [
          {
            scenarioId: "scen-1",
            stage: "revelation-crisis",
          },
        ],
      },
      { turnId: "turn-err", inputId: "input-err", now },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "invalid-transition")).toBe(
      true,
    );
  });

  it("rejects stage regression (e.g. actionable-clue back to hearsay)", () => {
    const session = createSession([
      createTestScenario("scen-1", "heard", "actionable-clue"),
    ]);
    const result = applyCompletedTurn(
      session,
      {
        kind: "complete",
        narration: "Nothing new is found.",
        visiblePatch: emptyPatch(),
        hiddenPatch: emptyHiddenPatch(),
        revealSecretIds: [],
        provisionalFacts: [],
        sourceRecordIds: [],
        elaborateScenarios: [
          {
            scenarioId: "scen-1",
            stage: "hearsay",
          },
        ],
      },
      { turnId: "turn-regr", inputId: "input-regr", now },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "invalid-transition")).toBe(
      true,
    );
  });

  it("allows peaceful off-script play without escalating the scenario stage", () => {
    const session = createSession([
      createTestScenario("scen-1", "heard", "hearsay"),
    ]);
    const result = applyCompletedTurn(
      session,
      {
        kind: "complete",
        narration:
          "You spend a peaceful afternoon helping the innkeeper chop firewood.",
        visiblePatch: emptyPatch(),
        hiddenPatch: emptyHiddenPatch(),
        revealSecretIds: [],
        provisionalFacts: [],
        sourceRecordIds: [],
      },
      { turnId: "turn-peace", inputId: "input-peace", now },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scenarioCollection?.items[0]?.stage).toBe("hearsay");
  });

  it("allows resolving a rumour quietly without progressing to crisis", () => {
    const session = createSession([
      createTestScenario("scen-1", "heard", "hearsay"),
    ]);
    // The player discovers the rumour was harmless (e.g. young lovers meeting in secret)
    const result = applyCompletedTurn(
      session,
      {
        kind: "complete",
        narration:
          "You speak with the youth and realise the lights were merely lovers meeting secretly with lanterns.",
        visiblePatch: emptyPatch(),
        hiddenPatch: emptyHiddenPatch(),
        revealSecretIds: [],
        provisionalFacts: [],
        sourceRecordIds: [],
      },
      { turnId: "turn-resolve", inputId: "input-resolve", now },
    );

    expect(result.ok).toBe(true);
  });
});

describe("provisional facts deduplication and canonical authority", () => {
  it("does not create a provisional fact if matching an existing canonical source record", () => {
    const canonicalSource: AdventureSession["sourceRecords"][0] = {
      recordId: "rec-aldous",
      recordType: "character",
      displayName: "Aldous Vane",
      role: "anchor",
      availability: "available",
    };
    const session = createSession([], [canonicalSource]);

    const result = applyCompletedTurn(
      session,
      {
        kind: "complete",
        narration: "Aldous Vane greets you at the gate.",
        visiblePatch: emptyPatch(),
        hiddenPatch: emptyHiddenPatch(),
        revealSecretIds: [],
        provisionalFacts: [
          {
            kind: "person",
            name: "aldous vane", // case-insensitive match
            summary: "A merchant at the gate.",
            visibility: "player-visible",
          },
        ],
        sourceRecordIds: [],
      },
      { turnId: "turn-canon", inputId: "input-canon", now },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Must not add a duplicate provisional fact for canonical record
    expect(result.value.provisionalFacts).toHaveLength(0);
  });

  it("updates existing provisional fact in-place instead of creating a duplicate", () => {
    const existingFact = {
      id: "fact-1",
      kind: "person" as const,
      name: "Barnaby the Shepherd",
      summary: "An old shepherd.",
      introducedOnTurnId: "turn-0",
      visibility: "player-visible" as const,
      scenarioId: "scen-1",
    };
    const session = createSession([], [], [existingFact]);

    const result = applyCompletedTurn(
      session,
      {
        kind: "complete",
        narration: "Barnaby confesses he received hush money from smugglers.",
        visiblePatch: emptyPatch(),
        hiddenPatch: emptyHiddenPatch(),
        revealSecretIds: [],
        provisionalFacts: [
          {
            kind: "person",
            name: "Barnaby the Shepherd",
            summary: "An old shepherd who accepted bribe money from smugglers.",
            visibility: "player-visible",
            scenarioId: "scen-1",
          },
        ],
        sourceRecordIds: [],
      },
      { turnId: "turn-dedup", inputId: "input-dedup", now },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should retain exactly 1 provisional fact with the same ID, updating summary
    expect(result.value.provisionalFacts).toHaveLength(1);
    expect(result.value.provisionalFacts[0]?.id).toBe("fact-1");
    expect(result.value.provisionalFacts[0]?.summary).toBe(
      "An old shepherd who accepted bribe money from smugglers.",
    );
  });
});
