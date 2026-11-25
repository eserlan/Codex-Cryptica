import { describe, expect, it, vi } from "vitest";
import {
  aggregateCaseResults,
  runEvaluationCase,
} from "./adventure-evaluation-case";
import {
  completeProposal,
  makeCase,
  now,
} from "./adventure-evaluation.fixtures";

describe("adventure evaluation case execution", () => {
  it("calls injected clocks without a receiver", async () => {
    const receivers: unknown[] = [];
    function clock(this: unknown) {
      receivers.push(this);
      return 100;
    }
    await runEvaluationCase(makeCase(), "qa-model", {
      generation: { generate: vi.fn(async () => completeProposal()) },
      options: {},
      now: clock,
      commitNow: () => now,
    });
    expect(receivers).toEqual([undefined, undefined]);
  });

  it("runs sequential turns against committed state and attaches rubric reviews", async () => {
    const testCase = makeCase({
      turns: [{ playerAction: "Inspect." }, { playerAction: "Wait." }],
    });
    const generate = vi.fn(async () => completeProposal());
    const clock = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(125);
    const result = await runEvaluationCase(testCase, "qa-model", {
      generation: { generate },
      options: {},
      now: clock,
      commitNow: () => now,
    });

    expect(generate.mock.calls).toHaveLength(2);
    expect(result.passed).toBe(true);
    expect(result.telemetry).toMatchObject({
      durationMs: 25,
      modelCalls: 2,
      expansionCount: 0,
    });
    expect(result.progression.committedTurns).toBe(2);
    expect(
      result.telemetry.turns.every(
        (turn) =>
          turn.rubrics?.continuity === 1 &&
          turn.canonFailures?.length === 0 &&
          turn.consequenceFailures?.length === 0,
      ),
    ).toBe(true);
    expect(testCase.session.turns).toEqual([]);
  });

  it("stops after exhausted retries and reports zero continuity and nonnegative duration", async () => {
    const testCase = makeCase({
      turns: [
        { playerAction: "Inspect.", retryOnGenerationFailure: true },
        { playerAction: "Wait." },
      ],
    });
    const generate = vi.fn(async () => {
      throw new Error("unavailable");
    });
    const clock = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(90);
    const result = await runEvaluationCase(testCase, "qa-model", {
      generation: { generate },
      options: {},
      now: clock,
      commitNow: () => now,
    });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.continuity).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.executionFailures).toEqual([{ turn: 1, kind: "generation" }]);
    expect(result.progression).toMatchObject({
      retryAttempts: 1,
      committedTurns: 0,
    });
    expect(result.telemetry).toMatchObject({ durationMs: 0, modelCalls: 2 });
  });

  it("averages each rubric and requires all case results to pass", async () => {
    const result = await runEvaluationCase(makeCase(), "qa-model", {
      generation: { generate: vi.fn(async () => completeProposal()) },
      options: {},
      now: () => 0,
      commitNow: () => now,
    });
    const failed = {
      ...result,
      passed: false,
      agency: 0,
      secrecy: 0,
      continuity: 0,
      canonSafety: 0,
      consequenceCredibility: 0,
      unnecessaryEscalation: 0,
    };
    const aggregate = aggregateCaseResults("qa-model", [result, failed]);
    expect(aggregate).toMatchObject({
      provider: "qa-model",
      passed: false,
      agency: 0.5,
      secrecy: 0.5,
      continuity: 0.5,
      canonSafety: 0.5,
      consequenceCredibility: 0.5,
      unnecessaryEscalation: 0.5,
    });
    expect(aggregate.telemetry.modelCalls).toBe(2);
    expect(aggregate.cases).toEqual([result, failed]);
    expect(aggregateCaseResults("empty-provider", []).passed).toBe(false);
  });
});
