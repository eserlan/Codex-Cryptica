import { describe, expect, it } from "vitest";
import { applyCompletedTurn } from "../src/completed-turn";
import { meta, now, proposal, scenario, session } from "./reducer-fixtures";

describe("completed turn commits", () => {
  it("commits the complete state and history atomically with the supplied time", () => {
    const current = session();
    const next = proposal();
    next.provisionalFacts = [
      {
        kind: "person",
        name: "Mara",
        summary: "Guide",
        visibility: "player-visible",
      },
    ];
    next.hiddenPatch.secrets.add = [
      { text: "The moon waits", status: "hidden" },
    ];
    next.timeAdvance = { minutes: 5, cause: "Walking", developments: [] };
    const committedAt = "2026-11-10T12:05:00.000Z";
    let id = 0;
    const result = applyCompletedTurn(
      current,
      next,
      { ...meta, playerAction: "Walk" },
      committedAt,
      () => `fact-${++id}`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected turn");
    expect(result.value.revision).toBe(1);
    expect(result.value.updatedAt).toBe(committedAt);
    expect(result.value.lastPlayedAt).toBe(committedAt);
    expect(result.value.worldTime?.elapsedMinutes).toBe(5);
    expect(result.value.turns[0]).toMatchObject({
      id: meta.turnId,
      sequence: 0,
      playerAction: "Walk",
      committedAt,
      timeAdvance: { minutes: 5, cause: "Walking" },
      provisionalFactIds: ["fact-2"],
    });
    expect(current).toEqual(session());
    const duplicate = applyCompletedTurn(result.value, proposal(), meta);
    expect(duplicate).toEqual({
      ok: false,
      errors: [
        {
          code: "duplicate-input",
          message: "This action was already processed.",
        },
      ],
    });
  });

  it("keeps the original session unchanged when a later scenario step fails", () => {
    const current = session();
    current.scenarioCollection = {
      version: 1,
      items: [scenario()],
      focusedScenarioId: null,
    };
    const before = structuredClone(current);
    const next = proposal();
    next.revealScenarioIds = ["scenario-1"];
    next.elaborateScenarios = [
      { scenarioId: "missing", stage: "actionable-clue" },
    ];
    const result = applyCompletedTurn(
      current,
      next,
      meta,
      now,
      () => "event-1",
    );
    expect(!result.ok && result.errors[0]?.code).toBe("unknown-fact");
    expect(current).toEqual(before);
  });

  it("rejects a baseline truth rewrite before applying the hidden patch", () => {
    const current = session();
    current.scenarioCollection = {
      version: 1,
      items: [scenario()],
      focusedScenarioId: null,
    };
    const before = structuredClone(current);
    const next = proposal();
    next.hiddenPatch.secrets.update = [
      { id: "truth-1", text: "Replacement truth", status: "hidden" },
    ];
    expect(applyCompletedTurn(current, next, meta)).toEqual({
      ok: false,
      errors: [
        {
          code: "conflicting-patch",
          message: "Scenario baseline truth is immutable.",
        },
      ],
    });
    expect(current).toEqual(before);
  });

  it("rejects archived sessions, mismatched proposals, unknown reveals and oversized state", () => {
    expect(
      applyCompletedTurn({ ...session(), status: "archived" }, proposal(), meta)
        .ok,
    ).toBe(false);
    const wrong = applyCompletedTurn(
      session(),
      {
        kind: "roll-required",
        uncertainty: "Risk",
        stakes: "Loss",
        sourceRecordIds: [],
      },
      meta,
    );
    expect(!wrong.ok && wrong.errors[0]?.code).toBe("invalid-schema");
    const next = proposal();
    next.revealSecretIds = ["missing"];
    const unknown = applyCompletedTurn(session(), next, meta);
    expect(!unknown.ok && unknown.errors[0]?.code).toBe("unknown-secret");
    const large = session();
    large.visibleState.knownFacts = [
      { id: "large", text: "x".repeat(40_000), source: "provisional" },
    ];
    const before = structuredClone(large);
    const budget = applyCompletedTurn(large, proposal(), meta);
    expect(!budget.ok && budget.errors[0]?.code).toBe("state-budget-exceeded");
    expect(large).toEqual(before);
  });
});
