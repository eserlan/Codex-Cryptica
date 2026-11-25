import { describe, expect, it } from "vitest";
import {
  ADVENTURE_EVALUATION_CONDITIONS,
  createCaseExecutionState,
} from "./adventure-evaluation-model";
import { makeSession } from "./adventure-evaluation.fixtures";

describe("adventure evaluation model", () => {
  it("enumerates all eight treatments in effort, Director, and context order", () => {
    expect(
      ADVENTURE_EVALUATION_CONDITIONS.map((condition) => [
        condition.reasoningEffort,
        condition.directorEnabled,
        condition.contextMode,
      ]),
    ).toEqual([
      ["low", false, "retained"],
      ["low", false, "reconstructed"],
      ["low", true, "retained"],
      ["low", true, "reconstructed"],
      ["medium", false, "retained"],
      ["medium", false, "reconstructed"],
      ["medium", true, "retained"],
      ["medium", true, "reconstructed"],
    ]);
    expect(
      ADVENTURE_EVALUATION_CONDITIONS.every(
        ({ modelName }) => modelName === "luna-fast",
      ),
    ).toBe(true);
  });

  it("starts with the supplied session and independent empty execution records", () => {
    const session = makeSession();
    const state = createCaseExecutionState(session);
    const other = createCaseExecutionState(session);
    state.executionFailures.push({ turn: 1, kind: "generation" });

    expect(state.currentSession).toBe(session);
    expect(state.modelCalls).toBe(0);
    expect(state.retryAttempts).toBe(0);
    expect(state.evaluatedTurns).toEqual([]);
    expect(state.executedTurns).toEqual([]);
    expect(state.turnTelemetry).toEqual([]);
    expect(other.executionFailures).toEqual([]);
  });
});
