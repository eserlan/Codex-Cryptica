import { describe, expect, it } from "vitest";
import {
  MAX_GENERATION_INPUT_CHARS,
  MAX_SERIALIZED_STATE_CHARS,
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
});
