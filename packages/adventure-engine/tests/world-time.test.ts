import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  applyRollRequest,
  applyTimeAdvance,
  buildAdventurePrompt,
  createPlayerTranscript,
  parseAdventureSession,
  resolveRecordedRoll,
  recordPendingRollOutcome,
  type AdventureSession,
  type CompletedTurnProposal,
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

describe("fictional world time", () => {
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
    expect(buildAdventurePrompt({
      session: saved,
      phase: "action",
      playerAction: "Ask about the mill",
      anchors: [],
      relevant: [],
    }).state).toContain("refugees seek supplies");
  });

  it("accumulates elapsed time without inventing developments", () => {
    const base = session();
    const first = applyTimeAdvance(base, {
      minutes: 60,
      cause: "Rest one hour",
      developments: [],
    }, "one");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const next = applyTimeAdvance({ ...base, worldTime: first.value }, {
      minutes: 120,
      cause: "Rest two hours",
      developments: [],
    }, "two");
    expect(next.ok && next.value?.elapsedMinutes).toBe(180);
    expect(next.ok && next.value?.events).toEqual([]);
  });

  it("rejects unknown, duplicate and overlarge temporal events atomically", () => {
    const current = session();
    const advance = {
      minutes: 1440,
      cause: "Wait a day",
      developments: [
        { threadId: "unknown", text: "Something happened" },
      ],
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
    expect(committed.ok).toBe(false);
    expect(current.worldTime).toBeUndefined();
    expect(
      applyTimeAdvance(current, {
        minutes: 43_201,
        cause: "Implausibly long step",
        developments: [],
      }, "other").ok,
    ).toBe(false);
  });

  it("keeps the clock unchanged until a pending roll resolves", () => {
    const pending = applyRollRequest(session(), {
      kind: "roll-required",
      uncertainty: "Safe passage?",
      stakes: "Might be delayed",
      sourceRecordIds: [],
    }, { turnId: "roll", inputId: "action", now });
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
    const resolved = resolveRecordedRoll(
      recorded.value,
      resolution,
      { turnId: "resolved", inputId: "resolution", now },
    );
    expect(resolved.ok && resolved.value.worldTime?.elapsedMinutes).toBe(60);
  });
});
