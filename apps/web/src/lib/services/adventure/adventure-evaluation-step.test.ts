import { describe, expect, it, vi } from "vitest";
import type { AdventureTurnGenerationRequest } from "@codex/ai-engine";
import {
  createCaseExecutionState,
  type EvaluationExecutionDependencies,
} from "./adventure-evaluation-model";
import { runEvaluationStep } from "./adventure-evaluation-step";
import {
  completeProposal,
  makeCase,
  now,
  rollProposal,
} from "./adventure-evaluation.fixtures";

function executionDependencies(
  generation: EvaluationExecutionDependencies["generation"],
): EvaluationExecutionDependencies {
  return { generation, options: {}, now: () => 0, commitNow: () => now };
}

describe("adventure evaluation step execution", () => {
  it("commits accepted interaction turns before confirming the new revision", async () => {
    const testCase = makeCase();
    const state = createCaseExecutionState(testCase.session);
    const confirmInteraction = vi.fn();
    const clearInteraction = vi.fn();
    const generate = vi.fn(async () =>
      Object.assign(completeProposal(), {
        generationInfo: { transport: "interaction" as const },
      }),
    );

    await runEvaluationStep(
      testCase,
      "qa-model",
      { playerAction: "Inspect." },
      0,
      state,
      executionDependencies({ generate, confirmInteraction, clearInteraction }),
    );

    expect(state.currentSession.revision).toBe(1);
    expect(confirmInteraction).toHaveBeenCalledWith(testCase.session.id, 1);
    expect(clearInteraction).not.toHaveBeenCalled();
    expect(state.evaluatedTurns).toHaveLength(1);
    expect(state.executedTurns[0]).toMatchObject({ turn: 1, committed: true });
    expect(state.turnTelemetry[0]?.committed).toBe(true);
    expect(state.executionFailures).toEqual([]);
  });

  it("retries the identical request once, clearing rejected provider history", async () => {
    const testCase = makeCase();
    const state = createCaseExecutionState(testCase.session);
    const requests: AdventureTurnGenerationRequest[] = [];
    const generate = vi.fn(async (request: AdventureTurnGenerationRequest) => {
      requests.push(request);
      if (requests.length === 1) throw new Error("temporary failure");
      return Object.assign(completeProposal(), {
        generationInfo: { transport: "interaction" as const },
      });
    });
    const clearInteraction = vi.fn();
    await runEvaluationStep(
      testCase,
      "qa-model",
      { playerAction: "Inspect.", retryOnGenerationFailure: true },
      0,
      state,
      executionDependencies({ generate, clearInteraction }),
    );

    expect(requests[1]).toBe(requests[0]);
    expect(state.modelCalls).toBe(2);
    expect(state.retryAttempts).toBe(1);
    expect(state.turnTelemetry[0]?.generationAttempts).toBe(2);
    expect(clearInteraction).toHaveBeenCalledTimes(2);
    expect(state.currentSession.revision).toBe(1);
  });

  it("records generation failure without adding an evaluation or advancing state", async () => {
    const testCase = makeCase();
    const state = createCaseExecutionState(testCase.session);
    const generate = vi.fn(async () => {
      throw new Error("unavailable");
    });
    const clearInteraction = vi.fn();
    await runEvaluationStep(
      testCase,
      "qa-model",
      { playerAction: "Inspect.", expectsActionableProgression: true },
      0,
      state,
      executionDependencies({ generate, clearInteraction }),
    );

    expect(generate).toHaveBeenCalledTimes(1);
    expect(clearInteraction).toHaveBeenCalledTimes(1);
    expect(state.currentSession).toBe(testCase.session);
    expect(state.evaluatedTurns).toEqual([]);
    expect(state.executionFailures).toEqual([{ turn: 1, kind: "generation" }]);
    expect(state.turnTelemetry[0]?.expectedSignals).toEqual({
      actionableProgression: false,
    });
  });

  it("clears rejected commits without confirming provider interactions", async () => {
    const testCase = makeCase();
    const state = createCaseExecutionState(testCase.session);
    const clearInteraction = vi.fn();
    const confirmInteraction = vi.fn();
    const generate = vi.fn(async () =>
      Object.assign(completeProposal(), {
        generationInfo: { transport: "interaction" as const },
      }),
    );
    await runEvaluationStep(
      testCase,
      "qa-model",
      { playerAction: "Resolve.", phase: "roll-resolution" },
      0,
      state,
      executionDependencies({ generate, clearInteraction, confirmInteraction }),
    );

    expect(state.currentSession).toBe(testCase.session);
    expect(state.executionFailures).toEqual([{ turn: 1, kind: "commit" }]);
    expect(state.evaluatedTurns[0]?.commitFailed).toBe(true);
    expect(clearInteraction).toHaveBeenCalledTimes(1);
    expect(confirmInteraction).not.toHaveBeenCalled();
  });

  it.each(["stateless", undefined] as const)(
    "clears complete turns with transport %s",
    async (transport) => {
      const testCase = makeCase();
      const state = createCaseExecutionState(testCase.session);
      const clearInteraction = vi.fn();
      const confirmInteraction = vi.fn();
      const generate = vi.fn(async () =>
        Object.assign(completeProposal(), { generationInfo: { transport } }),
      );
      await runEvaluationStep(
        testCase,
        "qa-model",
        { playerAction: "Inspect." },
        0,
        state,
        executionDependencies({
          generate,
          clearInteraction,
          confirmInteraction,
        }),
      );
      expect(state.currentSession.revision).toBe(1);
      expect(clearInteraction).toHaveBeenCalledTimes(1);
      expect(confirmInteraction).not.toHaveBeenCalled();
    },
  );

  it("clears roll requests without committing or recording an execution failure", async () => {
    const testCase = makeCase();
    const state = createCaseExecutionState(testCase.session);
    const generate = vi.fn(async () => rollProposal());
    const clearInteraction = vi.fn();
    await runEvaluationStep(
      testCase,
      "qa-model",
      { playerAction: "Open." },
      0,
      state,
      executionDependencies({ generate, clearInteraction }),
    );
    expect(state.currentSession).toBe(testCase.session);
    expect(state.executionFailures).toEqual([]);
    expect(state.executedTurns[0]?.committed).toBe(false);
    expect(clearInteraction).toHaveBeenCalledTimes(1);
  });
});
