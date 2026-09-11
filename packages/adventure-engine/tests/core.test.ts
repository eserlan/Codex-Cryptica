import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  applyRollRequest,
  canTransition,
  dismissPendingRoll,
  parseAdventureSession,
  recordPendingRollOutcome,
  resolveRecordedRoll,
  type AdventureSession,
} from "../src";

const now = "2026-08-16T12:00:00.000Z";
const emptyPatch = {
  objectives: { add: [], update: [], removeIds: [] },
  activeCharacters: { add: [], update: [], removeIds: [] },
  knownFacts: { add: [], update: [], removeIds: [] },
  relationships: { add: [], update: [], removeIds: [] },
};
const emptyHiddenPatch = {
  secrets: { add: [], update: [], removeIds: [] },
  gmThreads: { add: [], update: [], removeIds: [] },
};

function session(): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 1,
    id: "session-1",
    vaultId: "vault-1",
    title: "The Lantern Road",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 0,
    playerCharacter: {
      kind: "provisional",
      name: "Mara",
      description: "A careful guide",
    },
    premise: "A lantern has gone dark at the edge of town.",
    sourceRecords: [],
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [
        {
          id: "secret-1",
          text: "The ferryman serves the moon",
          status: "hidden",
        },
      ],
      gmThreads: [],
    },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
  });
}

describe("adventure engine", () => {
  it("accepts a bounded session and rejects oversized state", () => {
    const valid = session();
    expect(valid.id).toBe("session-1");
    expect(() =>
      parseAdventureSession({
        ...valid,
        visibleState: {
          ...valid.visibleState,
          knownFacts: Array.from({ length: 61 }, (_, i) => ({
            id: `f-${i}`,
            text: "fact",
            source: "provisional",
          })),
        },
      }),
    ).toThrow();
  });

  it("reduces a complete turn without mutating the source", () => {
    const current = session();
    const result = applyCompletedTurn(
      current,
      {
        kind: "complete",
        narration: "The road opens ahead.",
        visiblePatch: {
          ...emptyPatch,
          situation: {
            text: "A dark road waits",
            source: "provisional",
          },
        },
        hiddenPatch: emptyHiddenPatch,
        revealSecretIds: [],
        provisionalFacts: [],
        sourceRecordIds: [],
      },
      {
        turnId: "turn-1",
        inputId: "input-1",
        playerAction: "Walk toward the lantern",
        now,
      },
    );
    expect(result.ok).toBe(true);
    expect(current.turns).toHaveLength(0);
    expect(result.ok && result.value.turns).toHaveLength(1);
  });

  it("assigns durable IDs to newly generated state instead of trusting model IDs", () => {
    const result = applyCompletedTurn(
      session(),
      {
        kind: "complete",
        narration: "A scout reaches the road.",
        visiblePatch: {
          ...emptyPatch,
          knownFacts: {
            add: [
              {
                text: "A scout watches from the ridge.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
        hiddenPatch: emptyHiddenPatch,
        revealSecretIds: [],
        provisionalFacts: [
          {
            kind: "person",
            name: "Ridge scout",
            summary: "A wary observer above the road.",
            visibility: "player-visible",
          },
        ],
        sourceRecordIds: [],
      },
      { turnId: "turn-1", inputId: "input-1", now },
      now,
      (() => {
        const ids = ["fact-allocated", "provisional-allocated"];
        return () => ids.shift() ?? "unused";
      })(),
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.visibleState.knownFacts[0]?.id).toBe(
      "fact-allocated",
    );
    expect(result.ok && result.value.provisionalFacts[0]?.id).toBe(
      "provisional-allocated",
    );
    expect(result.ok && result.value.turns[0]?.provisionalFactIds).toEqual([
      "provisional-allocated",
    ]);
  });

  it("rejects a generated turn when its ID factory cannot produce a unique ID", () => {
    const result = applyCompletedTurn(
      session(),
      {
        kind: "complete",
        narration: "A scout reaches the road.",
        visiblePatch: {
          ...emptyPatch,
          knownFacts: {
            add: [
              {
                text: "A scout watches from the ridge.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
        hiddenPatch: emptyHiddenPatch,
        revealSecretIds: [],
        provisionalFacts: [],
        sourceRecordIds: [],
      },
      { turnId: "turn-1", inputId: "input-1", now },
      now,
      () => "session-1",
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]?.code).toBe("id-allocation-failed");
  });

  it("rejects hidden canaries before commit", () => {
    const result = applyCompletedTurn(
      session(),
      {
        kind: "complete",
        narration: "The ferryman serves the moon.",
        visiblePatch: emptyPatch,
        hiddenPatch: emptyHiddenPatch,
        revealSecretIds: [],
        provisionalFacts: [],
        sourceRecordIds: [],
      },
      { turnId: "turn-1", inputId: "input-1", now },
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]?.code).toBe("hidden-leakage");
  });

  it("allows a secret to be mentioned when the turn explicitly reveals it", () => {
    const result = applyCompletedTurn(
      session(),
      {
        kind: "complete",
        narration: "The ferryman serves the moon.",
        visiblePatch: emptyPatch,
        hiddenPatch: emptyHiddenPatch,
        revealSecretIds: ["secret-1"],
        provisionalFacts: [],
        sourceRecordIds: [],
      },
      { turnId: "turn-reveal", inputId: "input-reveal", now },
    );
    expect(result.ok).toBe(true);
  });

  it("persists a roll result and prevents replacement or dismissal", () => {
    const pending = applyRollRequest(
      session(),
      {
        kind: "roll-required",
        uncertainty: "The bridge may collapse.",
        stakes: "You may lose the trail.",
        sourceRecordIds: [],
      },
      { turnId: "roll-1", inputId: "input-1", now },
    );
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    const recorded = recordPendingRollOutcome(
      pending.value,
      "input-1",
      { kind: "narrative", value: "partial success" },
      { turnId: "record-1", inputId: "input-1", now },
    );
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) return;
    expect(
      dismissPendingRoll(recorded.value, "input-1", {
        turnId: "dismiss-1",
        inputId: "input-1",
        now,
      }).ok,
    ).toBe(false);
  });

  it("allows only valid lifecycle transitions", () => {
    expect(canTransition("ready", "generating")).toBe(true);
    expect(canTransition("ready", "committing")).toBe(false);
  });

  it("copies a recorded outcome into one committed turn", () => {
    const pending = applyRollRequest(
      session(),
      {
        kind: "roll-required",
        uncertainty: "Risk",
        stakes: "Consequence",
        sourceRecordIds: [],
      },
      { turnId: "roll-1", inputId: "input-1", now },
    );
    if (!pending.ok) throw new Error("pending setup failed");
    const recorded = recordPendingRollOutcome(
      pending.value,
      "input-1",
      { kind: "numeric", value: 5 },
      { turnId: "record-1", inputId: "input-1", now },
    );
    if (!recorded.ok) throw new Error("record setup failed");
    const resolved = resolveRecordedRoll(
      recorded.value,
      {
        kind: "complete",
        narration: "The bridge holds.",
        visiblePatch: emptyPatch,
        hiddenPatch: emptyHiddenPatch,
        revealSecretIds: [],
        provisionalFacts: [],
        sourceRecordIds: [],
      },
      { turnId: "turn-1", inputId: "resolution-1", playerAction: "Cross", now },
    );
    expect(resolved.ok).toBe(true);
    expect(resolved.ok && resolved.value.pendingRoll).toBeNull();
    expect(resolved.ok && resolved.value.turns[0]?.rollOutcome?.value).toBe(5);
    expect(
      resolved.ok && resolved.value.turns[0]?.resolvedRoll?.outcome.value,
    ).toBe(5);
  });

  it("snapshots the dice expression and bands onto the resolved roll", () => {
    const pending = applyRollRequest(
      session(),
      {
        kind: "roll-required",
        uncertainty: "Risk",
        stakes: "Consequence",
        dice: {
          expression: "d20",
          outcomeBands: [{ id: "band-1", label: "Success", minimum: 11 }],
        },
        sourceRecordIds: [],
      },
      { turnId: "roll-1", inputId: "input-1", now },
    );
    if (!pending.ok) throw new Error("pending setup failed");
    const recorded = recordPendingRollOutcome(
      pending.value,
      "input-1",
      { kind: "numeric", value: 15 },
      { turnId: "record-1", inputId: "input-1", now },
    );
    if (!recorded.ok) throw new Error("record setup failed");
    const resolved = resolveRecordedRoll(
      recorded.value,
      {
        kind: "complete",
        narration: "The blow lands true.",
        visiblePatch: emptyPatch,
        hiddenPatch: emptyHiddenPatch,
        revealSecretIds: [],
        provisionalFacts: [],
        sourceRecordIds: [],
      },
      {
        turnId: "turn-1",
        inputId: "resolution-1",
        playerAction: "Strike",
        now,
      },
    );
    if (!resolved.ok) throw new Error("resolve failed");
    expect(resolved.value.turns[0]?.resolvedRoll?.expression).toBe("d20");
    expect(resolved.value.turns[0]?.resolvedRoll?.bands?.[0]?.label).toBe(
      "Success",
    );
  });
});
