import { describe, expect, it } from "vitest";
import {
  createPlayerTranscript,
  parseAdventureSession,
  type AdventureSession,
} from "@codex/adventure-engine";
import {
  adventureDiagnosticDeltaJson,
  adventureDiagnosticJson,
  adventureReviewJson,
  adventureReviewMarkdown,
  copyDiagnosticSnapshot,
  saveDiagnosticBaseline,
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

  it("omits package progress and its private event notes from JSON exports", () => {
    const source: AdventureSession = {
      ...exampleSession(),
      packageProgress: {
        sceneId: "scene-1",
        version: 1,
        records: [{ id: "secret-1", kind: "secret", status: "active" }],
        events: [
          {
            id: "event-1",
            turnId: "turn-1",
            recordId: "secret-1",
            kind: "secret",
            from: "unvisited",
            to: "active",
            certainty: "confirmed",
            note: "PACKAGE-LEDGER-PRIVATE-MARKER",
          },
        ],
      },
    };

    const result = adventureReviewJson(source);

    expect(JSON.parse(result)).not.toHaveProperty("packageProgress");
    expect(result).not.toContain("PACKAGE-LEDGER-PRIVATE-MARKER");
    expect(source.packageProgress?.events?.[0]?.note).toBe(
      "PACKAGE-LEDGER-PRIVATE-MARKER",
    );
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

  it("scores every turn, including condensed ones, and counts quiet streaks", () => {
    const source = manyTurns(10);
    const quietTurn = (i: number) => ({
      ...source.turns[i]!,
      timeAdvance: undefined,
      revealedSecretIds: [],
      provisionalFactIds: [],
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
    });
    source.turns = source.turns.map((_, i) => quietTurn(i));
    // Turn 4 moves the player and adds a fact; turn 9 stays quiet.
    source.turns[4] = {
      ...quietTurn(4),
      visiblePatch: {
        ...quietTurn(4).visiblePatch,
        location: { id: "l", text: "The lane", source: "provisional" },
        knownFacts: {
          add: [{ id: "f", text: "A fact", source: "provisional" }],
          update: [],
          removeIds: [],
        },
      },
    } as never;
    const out = JSON.parse(adventureDiagnosticJson(source, { recentTurns: 2 }));
    const signals = out.turns.map((t: { signals: unknown }) => t.signals);
    expect(out.turns[0].detail).toBe("condensed");
    expect(signals[0]).toEqual({ quiet: true });
    expect(signals[4]).toEqual({ locationChanged: true, stateChanges: 1 });
    expect(out.turns[9].signals.quiet).toBe(true);
    // Quiet runs: turns 0-3 (4 long) and 5-9 (5 long): longest 5, two reached 4.
    expect(out.summary.longestQuietRun).toBe(5);
    expect(out.summary.stalledScenes).toBe(2);
    expect(out._readme).toContain("signals");
  });

  it("counts location and situation clears as state changes, not quiet turns", () => {
    const source = manyTurns(6);
    const quietTurn = (i: number) => ({
      ...source.turns[i]!,
      timeAdvance: undefined,
      revealedSecretIds: [],
      provisionalFactIds: [],
    });
    source.turns = source.turns.map((_, i) => quietTurn(i));
    source.turns[2] = {
      ...quietTurn(2),
      visiblePatch: { ...quietTurn(2).visiblePatch, location: null },
    } as never;
    source.turns[5] = {
      ...quietTurn(5),
      visiblePatch: { ...quietTurn(5).visiblePatch, situation: null },
    } as never;

    const out = JSON.parse(adventureDiagnosticJson(source, { recentTurns: 6 }));

    expect(out.turns[2].signals).toEqual({ locationChanged: true });
    expect(out.turns[5].signals).toEqual({});
    expect(out.summary.longestQuietRun).toBe(2);
    expect(out.summary.stalledScenes).toBe(0);
  });

  it("flags repeated empty timeAdvance waits as quiet and breaks the run when a timed turn changes visible state", () => {
    const source = manyTurns(5);
    const emptyWait = (i: number) => ({
      ...source.turns[i]!,
      timeAdvance: { minutes: 1440, cause: "Waiting another day" },
      revealedSecretIds: [],
      provisionalFactIds: [],
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
    });
    source.turns = source.turns.map((_, i) => emptyWait(i));

    const stalledOut = JSON.parse(
      adventureDiagnosticJson(source, { recentTurns: 5 }),
    );
    expect(
      stalledOut.turns.every(
        (t: { signals: { quiet?: boolean } }) => t.signals.quiet === true,
      ),
    ).toBe(true);
    expect(stalledOut.summary.quietTurns).toBe(5);
    expect(stalledOut.summary.longestQuietRun).toBe(5);
    expect(stalledOut.summary.stalledScenes).toBe(1);

    // A timed turn with an observable change breaks the quiet run
    source.turns[4] = {
      ...emptyWait(4),
      visiblePatch: {
        ...emptyWait(4).visiblePatch,
        knownFacts: {
          add: [
            {
              id: "f-wait",
              text: "The permit arrived.",
              source: "provisional",
            },
          ],
          update: [],
          removeIds: [],
        },
      },
    } as never;

    const recoveredOut = JSON.parse(
      adventureDiagnosticJson(source, { recentTurns: 5 }),
    );
    expect(recoveredOut.turns[4].signals).toEqual({ stateChanges: 1 });
    expect(recoveredOut.summary.quietTurns).toBe(0);
    expect(recoveredOut.summary.longestQuietRun).toBe(4);
    expect(recoveredOut.summary.stalledScenes).toBe(1);
  });

  it("reports what the engine dropped from a turn, condensed or full, and totals it", () => {
    const source = manyTurns(6);
    source.turns[0] = {
      ...source.turns[0]!,
      dropped: ["reveal: unknown scenario s-1"],
    };
    source.turns[5] = {
      ...source.turns[5]!,
      dropped: ["elaborate: repeated", "timeAdvance: invalid-fictional-time"],
    };

    const out = JSON.parse(adventureDiagnosticJson(source, { recentTurns: 2 }));

    expect(out.turns[0].detail).toBe("condensed");
    expect(out.turns[0].dropped).toEqual(["reveal: unknown scenario s-1"]);
    expect(out.turns[5].dropped).toHaveLength(2);
    expect(out.turns[1].dropped).toBeUndefined();
    expect(out.summary.droppedParts).toBe(3);
    expect(out._readme).toContain("dropped");
  });

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
    expect(legacy.state.storySoFar).toBeNull();
    expect(legacy.summary.unsummarisedTurns).toBe(0);
    const noted = manyTurns(30);
    noted.storySoFar = {
      text: "Notes.",
      throughSequence: 9,
      updatedAt: "2026-11-11T10:00:00.000Z",
    };
    const withNotes = JSON.parse(adventureDiagnosticJson(noted));
    expect(withNotes.state.storySoFar.text).toBe("Notes.");
    expect(withNotes.summary.unsummarisedTurns).toBe(12);
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
      quietTurns: expect.any(Number),
      timeToFirstSign: null,
      timeToFirstActionableLead: null,
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

  it("reports only safe dialogue-loop counts and recovery status", () => {
    const source = manyTurns(4);
    const actions = [
      "Who is owed the debt?",
      "Who is the lender for this debt?",
      "Why does the ledger omit the debt's creditor?",
      "Who does this debt belong to?",
    ];
    const replies = [
      "I cannot name the creditor from this record.",
      "I don't know who the lender is.",
      "The clerk can't say who holds the debt.",
      "I won't guess at the creditor's identity.",
    ];
    source.turns = source.turns.map((turn, index) => ({
      ...turn,
      playerAction: actions[index]!,
      narration: replies[index]!,
      timeAdvance: undefined,
      provisionalFactIds: [],
    }));
    const out = JSON.parse(adventureDiagnosticJson(source));
    expect(out.summary.dialogueLoopTurns).toBe(4);
    expect(out.summary.dialogueRecoveryDue).toBe(true);
    expect(out._readme).toContain("dialogueLoopTurns");
    const fresh = JSON.parse(adventureDiagnosticJson(exampleSession()));
    expect(fresh.summary.dialogueLoopTurns).toBe(0);
    expect(fresh.summary.dialogueRecoveryDue).toBe(false);
    expect(fresh.summary.investigativeStallTurns).toBe(0);
    expect(fresh.summary.investigativeRecoveryDue).toBe(false);
    expect(fresh.summary.repeatedNonAnswerTurns).toBe(0);
  });

  it("reports investigative stall and repeated non-answer metrics in diagnostic summary (#5110)", () => {
    const source = manyTurns(3);
    source.worldTime = undefined;
    source.scenarioCollection!.items[0]!.knowledge = "heard";
    source.scenarioCollection!.focusedScenarioId = "scenario-1";
    source.turns = [
      {
        ...source.turns[0]!,
        id: "turn-0",
        sequence: 0,
        playerAction: "Ask the ferryman about the mill?",
        narration: "I don't know what happened at the mill.",
        provisionalFactIds: [],
      },
      {
        ...source.turns[1]!,
        id: "turn-1",
        sequence: 1,
        playerAction: "Ask the baker about the mill?",
        narration: "I cannot say anything about the mill.",
        provisionalFactIds: [],
      },
      {
        ...source.turns[2]!,
        id: "turn-2",
        sequence: 2,
        playerAction: "Ask the watchman about the mill?",
        narration: "I have no idea about the mill.",
        provisionalFactIds: [],
      },
    ];
    const out = JSON.parse(adventureDiagnosticJson(source));
    expect(out.summary.investigativeStallTurns).toBe(3);
    expect(out.summary.repeatedNonAnswerTurns).toBe(3);
    expect(out.summary.investigativeRecoveryDue).toBe(true);
    expect(out._readme).toContain("investigativeStallTurns");
    expect(out._readme).toContain("repeatedNonAnswerTurns");
    expect(out._readme).toContain("investigativeRecoveryDue");
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

  it("recognizes scenario reveals after reload and still flags unknown IDs on condensed turns", () => {
    const source = exampleSession();
    source.playerCharacter = {
      kind: "provisional",
      name: "Mara",
      description: "Traveler",
    };
    source.hiddenState.secrets = [];
    const scenario = source.scenarioCollection!.items[0]!;
    scenario.origin = { kind: "manual", manualId: "manual-1" };
    scenario.secretBindings.truth = "scenario-truth-1";
    scenario.secretBindings.eventIds = { "event-1": "scenario-event-1" };
    scenario.revealedSecretIds = ["scenario-truth-1"];
    source.turns[0]!.revealedSecretIds = ["scenario-truth-1"];

    const reloaded = parseAdventureSession(JSON.parse(JSON.stringify(source)));
    const beforeDiagnostics = structuredClone(reloaded);
    const diagnostic = JSON.parse(
      adventureDiagnosticJson(reloaded, { recentTurns: 0 }),
    );

    expect(diagnostic.integrityChecks.turnsRevealingUnknownSecrets).toEqual([]);
    expect(diagnostic.turns[0].detail).toBe("condensed");
    expect(reloaded).toEqual(beforeDiagnostics);

    const withUnknownReveal = structuredClone(reloaded);
    withUnknownReveal.turns[0]!.revealedSecretIds.push("unknown-secret");
    const beforeUnknownDiagnostics = structuredClone(withUnknownReveal);
    const unknownDiagnostic = JSON.parse(
      adventureDiagnosticJson(withUnknownReveal, { recentTurns: 0 }),
    );

    expect(
      unknownDiagnostic.integrityChecks.turnsRevealingUnknownSecrets,
    ).toEqual(["turn-1"]);
    expect(unknownDiagnostic.turns[0].detail).toBe("condensed");
    expect(withUnknownReveal).toEqual(beforeUnknownDiagnostics);
  });

  it("handles a session with no turns", () => {
    const source = exampleSession();
    source.turns = [];
    const out = JSON.parse(adventureDiagnosticJson(source));
    expect(out.turns).toEqual([]);
    expect(out.summary.lastPlayerAction).toBeNull();
  });

  it("reports discovery and actionable lead metrics in diagnostic summary", () => {
    const source = manyTurns(4);
    const scenario = source.scenarioCollection!.items[0]!;
    scenario.knowledge = "heard";
    scenario.events.push({
      id: "ev-sign",
      kind: "discovery",
      visibility: "player",
      text: "Miller missing rumour",
      at: "2026-11-11T10:01:00.000Z",
      turnId: "turn-1",
    });
    scenario.events.push({
      id: "ev-lead",
      kind: "discovery",
      visibility: "player",
      text: "Actionable clue: grain ledger found",
      at: "2026-11-11T10:02:00.000Z",
      turnId: "turn-2",
    });
    scenario.stage = "actionable-clue";

    const out = JSON.parse(adventureDiagnosticJson(source));
    expect(out.summary.timeToFirstSign).toBe(2);
    expect(out.summary.timeToFirstActionableLead).toBe(3);
  });

  it("emits a delta on subsequent diagnostic copies and supports forceFull", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    const firstSession = exampleSession();
    const first = copyDiagnosticSnapshot(firstSession, storage);
    expect(first.isDelta).toBe(false);
    expect(first.fromTurnCount).toBe(0);
    expect(first.toTurnCount).toBe(1);
    expect(JSON.parse(first.text).state.premise).toBe(firstSession.premise);
    saveDiagnosticBaseline(firstSession, storage);

    const nextSession = exampleSession();
    nextSession.revision = 3;
    nextSession.visibleState.knownFacts.push({
      id: "fact-new",
      source: "provisional",
      text: "The sluice gate was jammed.",
    });
    nextSession.turns.push({
      ...nextSession.turns[0]!,
      id: "turn-2",
      inputId: "input-2",
      sequence: 1,
      playerAction: "Inspect the sluice gate.",
      narration: "A wedge of oak holds the gate shut.",
    });

    const second = copyDiagnosticSnapshot(nextSession, storage);
    expect(second.isDelta).toBe(true);
    expect(second.fromTurnCount).toBe(1);
    expect(second.toTurnCount).toBe(2);
    const delta = JSON.parse(second.text);
    expect(delta.delta).toEqual({
      fromRevision: 2,
      toRevision: 3,
      fromTurnCount: 1,
      toTurnCount: 2,
      newTurnsCount: 1,
    });
    expect(delta.turns).toHaveLength(1);
    expect(delta.turns[0].id).toBe("turn-2");
    expect(delta.stateChanges.premise).toBeUndefined();
    expect(delta.stateChanges.visibleState.knownFacts.added).toHaveLength(1);
    expect(delta.stateChanges.visibleState.knownFacts.added[0].id).toBe(
      "fact-new",
    );
    saveDiagnosticBaseline(nextSession, storage);

    const forced = copyDiagnosticSnapshot(nextSession, storage, {
      forceFull: true,
    });
    expect(forced.isDelta).toBe(false);
    expect(JSON.parse(forced.text).turns).toHaveLength(2);
  });

  it("falls back to full diagnostic JSON on rewind or corrupt baseline storage", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    const twoTurns = manyTurns(2);
    copyDiagnosticSnapshot(twoTurns, storage);
    saveDiagnosticBaseline(twoTurns, storage);

    const rewound = exampleSession();
    const afterRewind = copyDiagnosticSnapshot(rewound, storage);
    expect(afterRewind.isDelta).toBe(false);

    store.set("codex-adventure-diagnostic-baseline:session-1", "{bad-json");
    const afterCorrupt = copyDiagnosticSnapshot(rewound, storage);
    expect(afterCorrupt.isDelta).toBe(false);
    expect(typeof adventureDiagnosticDeltaJson).toBe("function");
  });

  it("includes lastTurnRejection in full and delta diagnostic snapshots only when present", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    const session = exampleSession();
    const rejection = {
      reason: "hidden-leakage",
      diagnostic: {
        guard: "scenario-secret" as const,
        field: "narration",
        sourceRef: "scenario-1#truth",
      },
      revision: session.revision,
      recordedAt: "2026-11-22T11:45:00.000Z",
    };

    const cleanFull = JSON.parse(adventureDiagnosticJson(session));
    expect(cleanFull.lastTurnRejection).toBeUndefined();

    const rejectedFull = JSON.parse(
      adventureDiagnosticJson(session, { lastTurnRejection: rejection }),
    );
    expect(rejectedFull.lastTurnRejection).toEqual(rejection);

    copyDiagnosticSnapshot(session, storage);
    saveDiagnosticBaseline(session, storage);

    const rejectedDelta = JSON.parse(
      copyDiagnosticSnapshot(session, storage, {
        lastTurnRejection: rejection,
      }).text,
    );
    expect(rejectedDelta.lastTurnRejection).toEqual(rejection);
  });
});

describe("Adventure diagnostic generation metadata (#5112)", () => {
  function threeTurnSession(): AdventureSession {
    const base = exampleSession();
    base.scenarioCollection!.focusedScenarioId = "scenario-1";
    const template = base.turns[0]!;
    base.turns = [
      {
        ...template,
        id: "turn-1",
        sequence: 0,
        generation: {
          modelKey: "gemini-flash-lite",
          reasoningEffort: "high",
          transport: "interaction",
          threadMode: "new",
          requestChars: 1200,
          sourceCounts: { secrets: 1 },
          scenarioIds: ["scenario-1"],
          progressCategory: "no-observable-change",
        },
      },
      {
        ...template,
        id: "turn-2",
        sequence: 1,
        generation: {
          modelKey: "gemini-flash-lite",
          reasoningEffort: "high",
          transport: "interaction",
          threadMode: "continued",
          requestChars: 1300,
          scenarioIds: ["scenario-1"],
          progressCategory: "actionable-discovery",
        },
      },
      // Stateless fallback after provider failure: a fresh thread, never
      // retained history.
      {
        ...template,
        id: "turn-3",
        sequence: 2,
        generation: {
          transport: "stateless",
          threadMode: "reset",
          resetReason: "provider-expiry",
          scenarioIds: ["scenario-1"],
          progressCategory: "repeated-non-answer",
        },
      },
    ];
    base.provisionalFacts = base.provisionalFacts.map((fact) => ({
      ...fact,
      introducedOnTurnId: "turn-1",
    }));
    return base;
  }

  it("includes per-turn generation metadata and a bounded summary in the full diagnostic", () => {
    const source = threeTurnSession();
    const out = JSON.parse(adventureDiagnosticJson(source, { recentTurns: 3 }));
    expect(out.turns[0].generation.transport).toBe("interaction");
    expect(out.turns[1].generation.threadMode).toBe("continued");
    expect(out.turns[2].generation).toMatchObject({
      transport: "stateless",
      threadMode: "reset",
      resetReason: "provider-expiry",
    });
    // A stateless fallback is classified as a fresh/reset thread, never as
    // retained reuse.
    expect(out.summary.generation).toMatchObject({
      turnsWithGeneration: 3,
      turnsWithoutGeneration: 0,
      transportCounts: { interaction: 2, stateless: 1, unknown: 0 },
      threadModeCounts: { new: 1, continued: 1, reset: 1, unknown: 0 },
      threadReuseTurns: 1,
      resets: 1,
      lastResetReason: "provider-expiry",
      focusedScenarioId: "scenario-1",
      activeScenarioIds: ["scenario-1"],
      lastScenarioIds: ["scenario-1"],
      lastProgressCategory: "repeated-non-answer",
      recentProgressCategories: [
        "no-observable-change",
        "actionable-discovery",
        "repeated-non-answer",
      ],
      recentMeaningfulProgressTurns: 1,
    });
    expect(out._readme).toContain("generation:");
    expect(out._readme).toContain("capture and interpret a diagnostic");
  });

  it("keeps generation metadata on condensed turns and in delta new turns", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    const source = threeTurnSession();
    const condensed = JSON.parse(
      adventureDiagnosticJson(source, { recentTurns: 0 }),
    );
    expect(
      condensed.turns.every(
        (t: { detail: string }) => t.detail === "condensed",
      ),
    ).toBe(true);
    expect(condensed.turns[2].generation.resetReason).toBe("provider-expiry");

    copyDiagnosticSnapshot(source, storage);
    saveDiagnosticBaseline(source, storage);
    const next = threeTurnSession();
    next.revision = 3;
    next.turns.push({
      ...next.turns[2]!,
      id: "turn-4",
      sequence: 3,
      generation: {
        transport: "interaction",
        threadMode: "reset",
        resetReason: "scene-boundary",
        progressCategory: "causal-state-change",
      },
    });
    const delta = JSON.parse(copyDiagnosticSnapshot(next, storage).text);
    expect(delta.turns).toHaveLength(1);
    expect(delta.turns[0].generation).toMatchObject({
      transport: "interaction",
      threadMode: "reset",
      resetReason: "scene-boundary",
    });
    expect(delta.summary.generation.lastResetReason).toBe("scene-boundary");
    expect(delta.summary.generation.resets).toBe(2);
  });

  it("marks legacy turns without generation metadata as unknown and absent", () => {
    const out = JSON.parse(adventureDiagnosticJson(exampleSession()));
    expect(out.turns[0]).not.toHaveProperty("generation");
    expect(out.summary.generation).toMatchObject({
      turnsWithGeneration: 0,
      turnsWithoutGeneration: 1,
      transportCounts: { interaction: 0, stateless: 0, unknown: 1 },
      threadModeCounts: { new: 0, continued: 0, reset: 0, unknown: 1 },
      threadReuseTurns: 0,
      resets: 0,
      lastResetReason: null,
      lastProgressCategory: null,
      progressCategoryCounts: {},
      recentProgressCategories: [],
    });
    expect(out.summary.generation.activeScenarioIds).toEqual(["scenario-1"]);
  });

  it("records no generation for rejected or uncommitted turns", () => {
    // A rejected turn never commits, so it leaves no generation record; the
    // rejection diagnostic is the only channel. Same for a failed save: the
    // diagnostic only ever describes committed turns.
    const source = exampleSession();
    source.turns = [];
    const out = JSON.parse(
      adventureDiagnosticJson(source, {
        lastTurnRejection: {
          reason: "hidden-leakage",
          revision: source.revision,
          recordedAt: "2026-11-22T11:45:00.000Z",
        },
      }),
    );
    expect(out.turns).toEqual([]);
    expect(out.summary.generation.turnsWithGeneration).toBe(0);
    expect(out.summary.generation.resets).toBe(0);
    expect(out.lastTurnRejection.reason).toBe("hidden-leakage");
  });

  it("keeps generation and GM content out of the player projection", () => {
    const source = threeTurnSession();
    const transcript = createPlayerTranscript(source);
    const rendered = JSON.stringify(transcript);
    expect(rendered).not.toContain("generation");
    expect(rendered).not.toContain("resetReason");
    expect(rendered).not.toContain("scenario-1");
    expect(rendered).not.toContain("gemini-flash-lite");
    expect(rendered).not.toContain("provider-expiry");
  });

  it("includes Ask GM (OOC) exchanges in full and delta AI GM diagnostic JSON copies", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    const initial = exampleSession();
    initial.oocExchanges = [
      {
        id: "ooc-1",
        kind: "ooc",
        question: "Who is the quest giver?",
        answer: "Envoy Ilona Marshall.",
        status: "answered",
        afterTurnCount: 1,
        createdAt: "2026-11-22T11:30:00.000Z",
        updatedAt: "2026-11-22T11:30:05.000Z",
      },
    ];

    const full = copyDiagnosticSnapshot(initial, storage);
    expect(full.isDelta).toBe(false);
    expect(JSON.parse(full.text).state.oocExchanges).toEqual(
      initial.oocExchanges,
    );
    saveDiagnosticBaseline(initial, storage);

    const next = exampleSession();
    next.revision = initial.revision + 1;
    next.oocExchanges = [
      ...initial.oocExchanges,
      {
        id: "ooc-2",
        kind: "ooc",
        question: "Where is she waiting?",
        answer: "Berthing Ring C.",
        status: "answered",
        afterTurnCount: 1,
        createdAt: "2026-11-22T11:31:00.000Z",
        updatedAt: "2026-11-22T11:31:05.000Z",
      },
    ];

    const delta = copyDiagnosticSnapshot(next, storage);
    expect(delta.isDelta).toBe(true);
    expect(JSON.parse(delta.text).stateChanges.oocExchanges).toEqual({
      added: [next.oocExchanges[1]],
      updated: [],
      removedIds: [],
    });
    const parsedFull = JSON.parse(full.text);
    expect(parsedFull.summary.ooc).toEqual({
      totalExchanges: 1,
      answeredCount: 1,
      establishedDecisionsCount: 0,
      latestExchangeIds: ["ooc-1"],
      oocSourcedFactCount: 0,
    });
    expect(parsedFull.integrityChecks.orphanedPersonFactLinks).toEqual([]);
  });

  it("does not count responsive witness replies with epistemic limits as repeated-non-answer in diagnostic summary (#5175)", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    const session = exampleSession();
    session.turns = [
      {
        ...session.turns[0]!,
        id: "turn-1",
        playerAction: "Who is your employer?",
        narration:
          'Servant: "Master Vale; the steward is inside. I don\'t know the other household."',
        progress: undefined,
      },
      {
        ...session.turns[0]!,
        id: "turn-2",
        playerAction: "Where was the order returned, and who saw it?",
        narration:
          "Steward names the office, recipient and time, but cannot identify additional witnesses.",
        progress: undefined,
      },
    ];

    const snapshot = copyDiagnosticSnapshot(session, storage);
    const parsed = JSON.parse(snapshot.text);
    expect(parsed.summary.generation.recentProgressCategories).not.toContain(
      "repeated-non-answer",
    );
    expect(parsed.summary.repeatedNonAnswerTurns).toBe(0);
    expect(parsed.summary.investigativeRecoveryDue).toBe(false);
  });
});
