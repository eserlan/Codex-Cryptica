import { describe, expect, it } from "vitest";
import {
  MAX_DURABLE_STATE_CHARS,
  MAX_GENERATION_INPUT_CHARS,
  MAX_SERIALIZED_STATE_CHARS,
  STATE_BUDGET_WARNING_RATIO,
  measureStateBudget,
  validateDurableStateBudget,
  validateGenerationBudget,
  validateStateBudget,
} from "../src/session-budget";
import { session } from "./reducer-fixtures";

describe("session budgets", () => {
  it("accepts bounded state and rejects oversized state", () => {
    const input = session();
    expect(validateStateBudget(input)).toBe(true);
    input.visibleState.knownFacts.push({
      id: "fact-1",
      text: "x".repeat(MAX_SERIALIZED_STATE_CHARS),
      source: "canonical",
    });
    expect(validateStateBudget(input)).toBe(false);
  });

  it("excludes non-state session metadata from the state ceiling", () => {
    const input = session();
    input.title = "x".repeat(MAX_SERIALIZED_STATE_CHARS + 1);
    input.artwork = { private: "x".repeat(MAX_SERIALIZED_STATE_CHARS + 1) };
    expect(validateStateBudget(input)).toBe(true);
    input.storySoFar = {
      text: "x".repeat(MAX_SERIALIZED_STATE_CHARS),
      throughSequence: 0,
      updatedAt: input.updatedAt,
    };
    expect(validateStateBudget(input)).toBe(false);
  });

  it("keeps a valid mid-campaign investigation writable past the former 32k ceiling", () => {
    const input = session();
    input.visibleState.knownFacts = Array.from({ length: 56 }, (_, i) => ({
      id: `witness-fact-${i}`,
      text: `Witness ${i}: ${"x".repeat(550)}`,
      source: "provisional" as const,
    }));
    const measured = JSON.stringify({
      visibleState: input.visibleState,
      hiddenState: input.hiddenState,
      provisionalFacts: input.provisionalFacts,
      dismissedProvisionalFactIds: input.dismissedProvisionalFactIds,
      scenarioCollection: input.scenarioCollection,
      worldEntry: input.worldEntry,
      historicalAnchor: input.historicalAnchor,
      worldTime: input.worldTime,
      places: input.places,
      storySoFar: input.storySoFar,
    }).length;
    expect(measured).toBeGreaterThan(32_000);
    expect(measured).toBeLessThan(MAX_SERIALIZED_STATE_CHARS);
    expect(validateStateBudget(input)).toBe(true);
  });

  it("includes the generation ceiling and rejects one character beyond it", () => {
    expect(
      validateGenerationBudget("x".repeat(MAX_GENERATION_INPUT_CHARS)),
    ).toBe(true);
    expect(
      validateGenerationBudget("x".repeat(MAX_GENERATION_INPUT_CHARS + 1)),
    ).toBe(false);
  });

  it("measures per-section sizes and flags warning at 80% of hot budget", () => {
    const input = session();
    const baseline = measureStateBudget(input);
    expect(baseline.warning).toBe(false);
    expect(baseline.exceedsHotBudget).toBe(false);
    expect(baseline.exceedsDurableBudget).toBe(false);
    expect(baseline.hotBudgetChars).toBe(MAX_SERIALIZED_STATE_CHARS);
    expect(baseline.durableBudgetChars).toBe(MAX_DURABLE_STATE_CHARS);
    expect(Object.keys(baseline.sections)).toEqual([
      "visibleState",
      "hiddenState",
      "provisionalFacts",
      "dismissedProvisionalFactIds",
      "scenarioCollection",
      "worldEntry",
      "historicalAnchor",
      "worldTime",
      "places",
      "storySoFar",
    ]);

    const threshold = Math.floor(
      MAX_SERIALIZED_STATE_CHARS * STATE_BUDGET_WARNING_RATIO,
    );
    const pad = Math.max(1, threshold - baseline.totalChars + 200);
    input.visibleState.knownFacts.push({
      id: "warn-fact",
      text: "x".repeat(pad),
      source: "canonical",
    });
    const warned = measureStateBudget(input);
    expect(warned.warning).toBe(true);
    expect(warned.exceedsHotBudget).toBe(false);
    expect(warned.sections.visibleState).toBeGreaterThan(pad);
  });

  it("allows durable state beyond 48k up to MAX_DURABLE_STATE_CHARS", () => {
    const input = session();
    input.visibleState.knownFacts.push({
      id: "durable-fact",
      text: "x".repeat(60_000),
      source: "canonical",
    });
    expect(validateStateBudget(input)).toBe(false);
    expect(validateDurableStateBudget(input)).toBe(true);

    input.visibleState.knownFacts.push({
      id: "runaway-fact",
      text: "x".repeat(MAX_DURABLE_STATE_CHARS),
      source: "canonical",
    });
    expect(validateDurableStateBudget(input)).toBe(false);
  });
});
