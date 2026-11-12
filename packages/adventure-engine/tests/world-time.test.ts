import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  applyRollRequest,
  applyTimeAdvance,
  advanceManualWorldTime,
  buildAdventurePrompt,
  createPlayerTranscript,
  detectHiddenLeakage,
  parseAdventureSession,
  playerScenarioProjection,
  resolveRecordedRoll,
  recordPendingRollOutcome,
  type AdventureSession,
  type CompletedTurnProposal,
  type ScenarioItem,
  type ScenarioPressure,
} from "../src";

const now = "2026-11-02T12:00:00.000Z";
const collection = { add: [], update: [], removeIds: [] };

function session(): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 2,
    id: "world-time-test",
    vaultId: "vault-1",
    title: "The village",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 0,
    playerCharacter: {
      kind: "provisional",
      name: "Mara",
      description: "Scout",
    },
    premise: "Enter the world",
    sourceRecords: [],
    worldEntry: {
      version: 1,
      location: { kind: "provisional", name: "Northbrook" },
      at: { year: 618, precision: "year" },
      intent: "explore",
    },
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [],
      gmThreads: [
        {
          id: "mill",
          status: "hidden",
          text: "The mill refugees await news",
        },
      ],
    },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
  });
}

function proposal(): CompletedTurnProposal {
  return {
    kind: "complete",
    narration: "Morning comes.",
    visiblePatch: {
      objectives: collection,
      activeCharacters: collection,
      knownFacts: collection,
      relationships: collection,
    },
    hiddenPatch: {
      secrets: collection,
      gmThreads: collection,
    },
    revealSecretIds: [],
    provisionalFacts: [],
    sourceRecordIds: [],
  };
}

function scenarioWithPressure(
  id: string,
  truthText: string,
  pressure?: ScenarioPressure,
): ScenarioItem {
  return {
    version: 1,
    id,
    origin: {
      kind: "rumour",
      batchTitle: "Northbrook",
      batchId: `batch-${id}`,
      index: 1,
    },
    playerVisible: { rumour: `Rumour ${id}`, lead: `Lead ${id}` },
    gmOnly: { truth: truthText },
    ...(pressure ? { pressure } : {}),
    knowledge: "heard",
    stage: "hearsay",
    status: "open",
    events: [],
    anchorRefs: [],
    revealedSecretIds: [],
    secretBindings: { truth: `truth-${id}`, eventIds: {} },
  };
}

describe("fictional world time", () => {
  it("advances manually without AI and commits an idempotent local clock action", () => {
    const before = session();
    const advanced = advanceManualWorldTime(
      before,
      1440,
      "Rest a day",
      "manual-1",
      0,
      now,
    );
    expect(advanced.ok).toBe(true);
    if (!advanced.ok) return;
    expect(advanced.changed).toBe(true);
    expect(advanced.session.revision).toBe(1);
    expect(advanced.session.worldTime?.elapsedMinutes).toBe(1440);
    expect(before.worldTime).toBeUndefined();
    expect(advanced.session.turns).toHaveLength(0);
    expect(advanced.session.worldTime?.events[0]?.threadId).toBe(
      "manual-world-time",
    );
    const replay = advanceManualWorldTime(
      advanced.session,
      1440,
      "Rest a day",
      "manual-1",
      1,
      now,
    );
    expect(replay.ok && replay.changed).toBe(false);
    expect(replay.ok && replay.session.worldTime?.elapsedMinutes).toBe(1440);
    expect(createPlayerTranscript(advanced.session).turns).toEqual([]);
  });

  it("rejects stale, invalid and pending-roll manual clock commands", () => {
    const before = session();
    expect(
      advanceManualWorldTime(before, 60, "Rest", "id", 1, now),
    ).toMatchObject({
      ok: false,
      reason: "stale-revision",
    });
    expect(
      advanceManualWorldTime(before, 0, "Rest", "id", 0, now),
    ).toMatchObject({
      ok: false,
      reason: "invalid-fictional-time",
    });
    expect(
      advanceManualWorldTime(
        { ...before, pendingRoll: { id: "roll" } as never },
        60,
        "Rest",
        "id",
        0,
        now,
      ),
    ).toMatchObject({
      ok: false,
      reason: "pending-roll",
    });
  });

  it("never advances because an ordinary turn was committed", () => {
    const current = session();
    const result = applyCompletedTurn(current, proposal(), {
      turnId: "chat-1",
      inputId: "chat-input-1",
      playerAction: "Ask for news",
      now,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.worldTime).toBeUndefined();
    expect(result.value.worldEntry?.at?.year).toBe(618);
  });

  it("persists causal hidden changes after an explicit three-day wait", () => {
    const current = session();
    const turn = proposal();
    turn.timeAdvance = {
      minutes: 3 * 24 * 60,
      cause: "Wait three days",
      developments: [
        {
          threadId: "mill",
          text: "The refugees seek supplies while their guide is missing",
        },
      ],
    };
    const result = applyCompletedTurn(current, turn, {
      turnId: "wait-1",
      inputId: "wait-input-1",
      playerAction: "Wait three days",
      now,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const saved = parseAdventureSession(result.value);
    expect(saved.worldTime?.elapsedMinutes).toBe(4320);
    expect(saved.worldTime?.events).toEqual([
      {
        id: "wait-1:world:1",
        turnId: "wait-1",
        atMinute: 4320,
        threadId: "mill",
        text: "The refugees seek supplies while their guide is missing",
      },
    ]);
    expect(saved.turns[0]?.timeAdvance).toEqual({
      minutes: 4320,
      cause: "Wait three days",
    });
    expect(createPlayerTranscript(saved).turns[0]?.narration).toBe(
      "Morning comes.",
    );
    expect(JSON.stringify(createPlayerTranscript(saved))).not.toContain(
      "refugees seek supplies",
    );
    expect(current.worldTime).toBeUndefined();
    expect(saved.worldEntry?.at?.year).toBe(618);
    const prompt = buildAdventurePrompt({
      session: saved,
      phase: "action",
      playerAction: "Ask about the mill",
      anchors: [],
      relevant: [],
    });
    expect(prompt.state).toContain("refugees seek supplies");
  });

  it("accumulates elapsed time without inventing developments", () => {
    const base = session();
    const first = applyTimeAdvance(
      base,
      { minutes: 60, cause: "Rest one hour", developments: [] },
      "one",
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const next = applyTimeAdvance(
      { ...base, worldTime: first.value },
      { minutes: 120, cause: "Rest two hours", developments: [] },
      "two",
    );
    expect(next.ok && next.value?.elapsedMinutes).toBe(180);
    expect(next.ok && next.value?.events).toEqual([]);
  });

  it("leaves the clock alone for invalid temporal events and still commits the turn", () => {
    const current = session();
    const advance = {
      minutes: 1440,
      cause: "Wait a day",
      developments: [{ threadId: "unknown", text: "Something happened" }],
    };
    expect(applyTimeAdvance(current, advance, "wait")).toEqual({
      ok: false,
      reason: "unknown-or-duplicate-background-thread",
    });
    const turn = proposal();
    turn.timeAdvance = advance;
    const committed = applyCompletedTurn(current, turn, {
      turnId: "wait",
      inputId: "wait-input",
      now,
    });
    // The clock stays put and the turn still commits, with the slip recorded.
    expect(committed.ok).toBe(true);
    if (committed.ok) {
      expect(committed.value.worldTime).toBeUndefined();
      expect(committed.value.turns[0]?.timeAdvance).toBeUndefined();
      expect(committed.value.turns[0]?.dropped).toEqual([
        "timeAdvance: unknown-or-duplicate-background-thread",
      ]);
    }
    expect(current.worldTime).toBeUndefined();
    const oversized = applyTimeAdvance(
      current,
      {
        minutes: 43_201,
        cause: "Implausibly long step",
        developments: [],
      },
      "other",
    );
    expect(oversized.ok).toBe(false);
  });

  it("keeps the clock unchanged until a pending roll resolves", () => {
    const request = {
      kind: "roll-required" as const,
      uncertainty: "Safe passage?",
      stakes: "Might be delayed",
      sourceRecordIds: [],
    };
    const pending = applyRollRequest(session(), request, {
      turnId: "roll",
      inputId: "action",
      now,
    });
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    expect(pending.value.worldTime).toBeUndefined();
    const recorded = recordPendingRollOutcome(
      pending.value,
      "action",
      { kind: "numeric", value: 12 },
      { turnId: "record", inputId: "action", now },
    );
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) return;
    const resolution = proposal();
    resolution.timeAdvance = {
      minutes: 60,
      cause: "Crossing takes one hour",
      developments: [],
    };
    const resolved = resolveRecordedRoll(recorded.value, resolution, {
      turnId: "resolved",
      inputId: "resolution",
      now,
    });
    expect(resolved.ok && resolved.value.worldTime?.elapsedMinutes).toBe(60);
  });

  it("uses schema-valid pressure IDs for maximum-length scenario IDs", () => {
    const longIdScenario = scenarioWithPressure(
      "temporary-id",
      "The miller hides in the cellar.",
      {
        actor: "Miller Eldon",
        goal: "Hide the grain",
        currentStance: "Waiting",
        trigger: "Four days pass",
        progression: "The cellar floods",
        expectedConsequence: "The grain is ruined.",
        triggerAfterMinutes: 60,
      },
    );
    longIdScenario.id = "s".repeat(160);
    longIdScenario.origin.batchId = "batch-id";
    longIdScenario.secretBindings.truth = "truth-id";

    const initial = session();
    initial.scenarioCollection = {
      version: 1,
      items: [longIdScenario],
      focusedScenarioId: longIdScenario.id,
    };
    const advanced = advanceManualWorldTime(
      initial,
      60,
      "Wait an hour",
      "manual-pressure-id",
      0,
      now,
    );

    expect(advanced.ok).toBe(true);
    if (!advanced.ok) return;
    const event = advanced.session.scenarioCollection!.items[0]!.events[0]!;
    expect(event.id.length).toBeLessThanOrEqual(160);
    expect(parseAdventureSession(advanced.session).scenarioCollection).toEqual(
      advanced.session.scenarioCollection,
    );
  });

  it("rejects a pressure trigger when the scenario event history is full", () => {
    const fullScenario = scenarioWithPressure(
      "full-scenario",
      "A hidden truth.",
      {
        actor: "Miller Eldon",
        goal: "Hide the grain",
        currentStance: "Waiting",
        trigger: "Four days pass",
        progression: "The cellar floods",
        expectedConsequence: "The grain is ruined.",
        triggerAfterMinutes: 60,
      },
    );
    fullScenario.events = Array.from({ length: 100 }, (_, index) => ({
      id: `old-event-${index}`,
      kind: "discovery" as const,
      visibility: "player" as const,
      text: `Old event ${index}`,
      at: now,
    }));
    const initial = session();
    initial.scenarioCollection = {
      version: 1,
      items: [fullScenario],
      focusedScenarioId: fullScenario.id,
    };

    const advanced = advanceManualWorldTime(
      initial,
      60,
      "Wait an hour",
      "manual-full-pressure",
      0,
      now,
    );

    expect(advanced).toMatchObject({
      ok: false,
      reason: "state-budget-exceeded",
    });
    expect(initial.worldTime).toBeUndefined();
    expect(initial.scenarioCollection?.items[0]?.events).toHaveLength(100);
    expect(
      initial.scenarioCollection?.items[0]?.pressure?.triggeredAtMinute,
    ).toBeUndefined();
  });

  it("rejects a completed turn when its pressure consequence cannot be recorded", () => {
    const fullScenario = scenarioWithPressure(
      "full-scenario",
      "A hidden truth.",
      {
        actor: "Miller Eldon",
        goal: "Hide the grain",
        currentStance: "Waiting",
        trigger: "Four days pass",
        progression: "The cellar floods",
        expectedConsequence: "The grain is ruined.",
        triggerAfterMinutes: 60,
      },
    );
    fullScenario.events = Array.from({ length: 100 }, (_, index) => ({
      id: `old-event-${index}`,
      kind: "discovery" as const,
      visibility: "player" as const,
      text: `Old event ${index}`,
      at: now,
    }));
    const initial = session();
    initial.scenarioCollection = {
      version: 1,
      items: [fullScenario],
      focusedScenarioId: fullScenario.id,
    };
    const turn = proposal();
    turn.timeAdvance = {
      minutes: 60,
      cause: "Wait an hour",
      developments: [],
    };

    const result = applyCompletedTurn(initial, turn, {
      turnId: "full-pressure-turn",
      inputId: "full-pressure-input",
      now,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.code).toBe("state-budget-exceeded");
    expect(initial.worldTime).toBeUndefined();
    expect(initial.scenarioCollection?.items[0]?.events).toHaveLength(100);
  });

  // fallow-ignore-next-line complexity
  it("triggers scenario pressure consequence at most once after four days travel, keeping it hidden until revealed upon return", () => {
    const millerConsequence =
      "The miller fled the cellar, abandoning damp and ruined grain bags.";
    const miller = scenarioWithPressure(
      "miller",
      "The miller hides in the mill cellar.",
      {
        actor: "Miller Eldon",
        goal: "Hide surplus grain bags under the cellar floorboards",
        currentStance: "Lurking in cellar waiting out the search",
        trigger: "Passage of 4 days without search",
        progression: "Cellar dampness rots bags and rats gather",
        expectedConsequence: millerConsequence,
        triggerAfterMinutes: 5760,
      },
    );
    const blacksmith = scenarioWithPressure(
      "blacksmith",
      "The blacksmith works secretly for the guild.",
      {
        actor: "Smith Torin",
        goal: "Complete weapons shipment",
        currentStance: "Working forge routinely",
        trigger: "Iron ore supply cut off",
        progression: "Forge fires cool",
        expectedConsequence: "The forge shuts down.",
      },
    );
    const caravan = scenarioWithPressure(
      "caravan",
      "The caravan carries illicit relics.",
      {
        actor: "Merchant Greta",
        goal: "Cross eastern pass",
        currentStance: "Camped near foothills",
        trigger: "Passage of 7 days",
        progression: "Rations deplete",
        expectedConsequence: "Caravan abandons eastern pass route.",
        triggerAfterMinutes: 10080,
      },
    );

    const initial = session();
    initial.scenarioCollection = {
      version: 1,
      items: [miller, blacksmith, caravan],
      focusedScenarioId: "miller",
    };

    // Before traveling, expected consequence leakage is guarded against premature narration.
    const prematureLeakTurn: CompletedTurnProposal = {
      ...proposal(),
      narration: `Word arrives that ${millerConsequence}`,
    };
    expect(detectHiddenLeakage(initial, prematureLeakTurn)).not.toHaveLength(0);

    // Player travels for 4 fictional days (4 * 1440 = 5760 minutes) via AI-independent manual clock.
    const advanceResult = advanceManualWorldTime(
      initial,
      5760,
      "Travel four days across the valley",
      "manual-travel-4d",
      0,
      now,
    );
    expect(advanceResult.ok).toBe(true);
    if (!advanceResult.ok) return;
    expect(advanceResult.changed).toBe(true);

    const advancedSession = advanceResult.session;
    expect(advancedSession.worldTime?.elapsedMinutes).toBe(5760);

    const advancedMiller = advancedSession.scenarioCollection!.items.find(
      (item) => item.id === "miller",
    )!;
    expect(advancedMiller.pressure?.triggeredAtMinute).toBe(5760);
    expect(advancedMiller.events).toHaveLength(1);
    expect(advancedMiller.events[0]?.kind).toBe("consequence");
    expect(advancedMiller.events[0]?.visibility).toBe("gm");
    expect(advancedMiller.events[0]?.text).toBe(millerConsequence);

    // Secret binding exists for the consequence event.
    const consequenceEventId = advancedMiller.events[0]!.id;
    const consequenceSecretId =
      advancedMiller.secretBindings.eventIds[consequenceEventId];
    expect(consequenceSecretId).toBeDefined();

    // Player cannot see it yet while away.
    const playerTranscript = createPlayerTranscript(advancedSession);
    expect(JSON.stringify(playerTranscript)).not.toContain(millerConsequence);
    const playerProjection = playerScenarioProjection(advancedMiller);
    expect(playerProjection?.events).toHaveLength(0);

    // The other scenarios remain unaffected.
    const advancedBlacksmith = advancedSession.scenarioCollection!.items.find(
      (item) => item.id === "blacksmith",
    )!;
    expect(advancedBlacksmith.events).toHaveLength(0);
    expect(advancedBlacksmith.pressure?.triggeredAtMinute).toBeUndefined();

    const advancedCaravan = advancedSession.scenarioCollection!.items.find(
      (item) => item.id === "caravan",
    )!;
    expect(advancedCaravan.events).toHaveLength(0);
    expect(advancedCaravan.pressure?.triggeredAtMinute).toBeUndefined();

    // Advancing more time (e.g. 2 more days = 2880m) does NOT trigger miller consequence a second time.
    const secondAdvance = advanceManualWorldTime(
      advancedSession,
      2880,
      "Travel two more days",
      "manual-travel-2d",
      advancedSession.revision,
      now,
    );
    expect(secondAdvance.ok).toBe(true);
    if (!secondAdvance.ok) return;
    const secondMiller = secondAdvance.session.scenarioCollection!.items.find(
      (item) => item.id === "miller",
    )!;
    expect(secondMiller.events).toHaveLength(1);
    expect(secondMiller.pressure?.triggeredAtMinute).toBe(5760);

    // Prompt includes scenario pressure and instructs GM on off-screen consequences.
    const prompt = buildAdventurePrompt({
      session: secondAdvance.session,
      phase: "action",
      playerAction: "Return to Northbrook and check the mill",
      anchors: [],
      relevant: [],
    });
    expect(prompt.state).toContain("Miller Eldon");
    expect(prompt.state).toContain(millerConsequence);
    expect(prompt.behavior).toContain("off-screen consequences");

    // Returning to Northbrook and observing the consequence reveals the secret.
    const returnProposal: CompletedTurnProposal = {
      ...proposal(),
      narration:
        "You step into the mill cellar. The smell of dampness and rotting grain fills the air.",
      revealSecretIds: [consequenceSecretId!],
    };
    const returnTurnResult = applyCompletedTurn(
      secondAdvance.session,
      returnProposal,
      {
        turnId: "return-turn-1",
        inputId: "return-input-1",
        playerAction: "Check the mill cellar",
        now,
      },
    );
    expect(returnTurnResult.ok).toBe(true);
    if (!returnTurnResult.ok) return;

    const returnedSession = returnTurnResult.value;
    const returnedMiller = returnedSession.scenarioCollection!.items.find(
      (item) => item.id === "miller",
    )!;
    expect(returnedMiller.revealedSecretIds).toContain(consequenceSecretId);

    // Now playerScenarioProjection includes the revealed consequence event!
    const returnedProjection = playerScenarioProjection(returnedMiller);
    expect(returnedProjection?.events).toHaveLength(1);
    expect(returnedProjection?.events[0]?.text).toBe(millerConsequence);

    // Roundtrip serialization and parsing preserves everything.
    const reloaded = parseAdventureSession(
      JSON.parse(JSON.stringify(returnedSession)),
    );
    expect(
      reloaded.scenarioCollection?.items.find((item) => item.id === "miller")
        ?.pressure?.triggeredAtMinute,
    ).toBe(5760);
  });

  // fallow-ignore-next-line complexity
  it("applies turn-based timeAdvance developments directly to target scenarios as GM consequence events", () => {
    const miller = scenarioWithPressure(
      "miller",
      "The miller hides in the mill cellar.",
    );
    const initial = session();
    initial.scenarioCollection = {
      version: 1,
      items: [miller],
      focusedScenarioId: "miller",
    };

    const turnWithTime: CompletedTurnProposal = {
      ...proposal(),
      narration: "A quiet day passes in the hills.",
      timeAdvance: {
        minutes: 1440,
        cause: "Wait for nightfall",
        developments: [
          {
            threadId: "miller",
            text: "The cellar flooded after night rain.",
          },
          {
            threadId: "mill",
            text: "The mill refugees relocated to the shrine.",
          },
        ],
      },
    };

    const turnResult = applyCompletedTurn(initial, turnWithTime, {
      turnId: "time-turn-1",
      inputId: "time-input-1",
      playerAction: "Wait a day in the hills",
      now,
    });
    expect(turnResult.ok).toBe(true);
    if (!turnResult.ok) return;

    const saved = turnResult.value;
    expect(saved.worldTime?.elapsedMinutes).toBe(1440);
    expect(saved.worldTime?.events).toHaveLength(2);

    const savedMiller = saved.scenarioCollection!.items.find(
      (item) => item.id === "miller",
    )!;
    expect(savedMiller.events).toHaveLength(1);
    expect(savedMiller.events[0]?.text).toBe(
      "The cellar flooded after night rain.",
    );
    expect(savedMiller.events[0]?.kind).toBe("consequence");
    expect(savedMiller.events[0]?.visibility).toBe("gm");

    const devSecretId =
      savedMiller.secretBindings.eventIds[savedMiller.events[0]!.id];
    expect(devSecretId).toBeDefined();

    // Transcript does not expose the GM development.
    expect(JSON.stringify(createPlayerTranscript(saved))).not.toContain(
      "cellar flooded",
    );
  });

  it("rejects timeAdvance developments targeting unknown or closed scenarios", () => {
    const miller = scenarioWithPressure(
      "miller",
      "The miller hides in the mill cellar.",
    );
    miller.status = "resolved";
    const initial = session();
    initial.scenarioCollection = {
      version: 1,
      items: [miller],
      focusedScenarioId: null,
    };

    const advance = {
      minutes: 1440,
      cause: "Wait a day",
      developments: [
        {
          threadId: "miller", // resolved, not open!
          text: "Something happened in the closed scenario",
        },
      ],
    };
    expect(applyTimeAdvance(initial, advance, "test-turn")).toEqual({
      ok: false,
      reason: "unknown-or-duplicate-background-thread",
    });
  });
});
