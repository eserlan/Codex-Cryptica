import { describe, expect, it } from "vitest";
import type { AdventureSession } from "@codex/adventure-engine";
import {
  adventureDiagnosticJson,
  adventureReviewJson,
  adventureReviewMarkdown,
} from "./adventure-review-capture";

function exampleSession(): AdventureSession {
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

describe("GM-only Adventure review capture", () => {
  it("copies the complete canonical session as readable JSON without mutating it", () => {
    const source = exampleSession();
    const before = structuredClone(source);
    const result = adventureReviewJson(source);
    expect(JSON.parse(result)).toEqual(source);
    expect(source).toEqual(before);
    expect(result).toContain("The merchant secretly destroyed the stock.");
  });

  it("includes every turn, hidden scenarios, event ledger and provisional entities in Markdown", () => {
    const report = adventureReviewMarkdown(exampleSession());
    expect(report).toContain("GM-only review copy");
    expect(report).toContain("### Turn 1 (turn-1)");
    expect(report).toContain("Ask the baker about local news.");
    expect(report).toContain("The baker says the market is quiet.");
    expect(report).toContain("Unheard scenarios: 1");
    expect(report).toContain("Elapsed fictional time: 1d");
    expect(report).toContain("The grain was spoiled by a leaky roof.");
    expect(report).toContain("The merchant secretly destroyed the stock.");
    expect(report).toContain("The caravan moved overnight.");
    expect(report).toContain("The baker");
    expect(report).toContain("Committed state-change ledger");
    expect(report).not.toContain("undefined");
  });

  it("handles a session without scenarios or prior turns", () => {
    const session = exampleSession();
    session.scenarioCollection = undefined;
    session.worldTime = undefined;
    session.turns = [];
    const report = adventureReviewMarkdown(session);
    expect(report).toContain("No committed turns yet.");
    expect(report).toContain("Scenarios: 0");
    expect(report).toContain("Elapsed fictional time: 0m");
  });
});

describe("Adventure diagnostic JSON for AI", () => {
  function manyTurns(count: number): AdventureSession {
    const base = exampleSession();
    const template = base.turns[0];
    base.turns = Array.from({ length: count }, (_, index) => ({
      ...template,
      id: "turn-" + index,
      sequence: index,
      timeAdvance: index === 0 ? template.timeAdvance : undefined,
    }));
    base.provisionalFacts = base.provisionalFacts.map((fact) => ({
      ...fact,
      introducedOnTurnId: "turn-0",
    }));
    return base;
  }

  it("reports where the player is and keeps place tags in the snapshot", () => {
    const source = manyTurns(2);
    source.places = [
      { id: "p-1", name: "Tiny village" },
      { id: "p-2", name: "Lower village", relation: "below Tiny village" },
    ];
    source.currentPlaceId = "p-2";
    source.visibleState.knownFacts = [
      { id: "f-1", text: "Sela bakes", source: "provisional", placeId: "p-1" },
    ];
    const out = JSON.parse(adventureDiagnosticJson(source));
    expect(out.summary.currentPlace).toBe("Lower village");
    expect(out.state.currentPlaceId).toBe("p-2");
    expect(out.state.places).toHaveLength(2);
    expect(out.state.visibleState.knownFacts[0].placeId).toBe("p-1");
    const legacy = JSON.parse(adventureDiagnosticJson(manyTurns(2)));
    expect(legacy.summary.currentPlace).toBeNull();
    expect(legacy.state.places).toEqual([]);
  });

  it("condenses older turns, keeps recent ones in full and makes time advance explicit", () => {
    const source = manyTurns(5);
    const before = structuredClone(source);
    const out = JSON.parse(adventureDiagnosticJson(source, { recentTurns: 2 }));
    expect(source).toEqual(before);
    expect(out._readme).toContain("GM-only");
    expect(out.summary).toMatchObject({
      turnsTotal: 5,
      turnsFull: 2,
      turnsCondensed: 3,
      hiddenSecrets: 1,
      unheardScenarios: 1,
      pendingRoll: false,
    });
    expect(out.turns.map((t: { detail: string }) => t.detail)).toEqual([
      "condensed",
      "condensed",
      "condensed",
      "full",
      "full",
    ]);
    expect(out.turns[1]).not.toHaveProperty("visiblePatch");
    expect(out.turns[4]).toHaveProperty("visiblePatch");
    expect(out.turns[0].timeAdvance).toEqual({
      minutes: 1440,
      cause: "Rested overnight",
    });
    expect(out.turns[1].timeAdvance).toBeNull();
    expect(out.turns[4].timeAdvance).toBeNull();
    expect(out.state.hiddenState.secrets[0].text).toContain("miller");
    expect(Object.values(out.integrityChecks).flat()).toEqual([]);
  });

  it("is smaller than the full copy for long sessions", () => {
    const source = manyTurns(60);
    expect(adventureDiagnosticJson(source).length).toBeLessThan(
      adventureReviewJson(source).length,
    );
  });

  it("reports broken references instead of hiding them", () => {
    const source = manyTurns(2);
    source.provisionalFacts[0].introducedOnTurnId = "gone";
    source.turns[1].revealedSecretIds = ["nope"];
    source.turns[1].sequence = 7;
    source.hiddenState.secrets[0].status = "revealed";
    const checks = JSON.parse(adventureDiagnosticJson(source)).integrityChecks;
    expect(checks.factsIntroducedOnMissingTurn).toEqual([
      source.provisionalFacts[0].id,
    ]);
    expect(checks.turnsRevealingUnknownSecrets).toEqual(["turn-1"]);
    expect(checks.nonContiguousTurnSequences).toEqual(["turn-1"]);
    expect(checks.secretsMarkedRevealedWithoutTurn).toEqual(["secret-1"]);
  });

  it("handles a session with no turns", () => {
    const source = exampleSession();
    source.turns = [];
    const out = JSON.parse(adventureDiagnosticJson(source));
    expect(out.turns).toEqual([]);
    expect(out.summary.lastPlayerAction).toBeNull();
  });
});
