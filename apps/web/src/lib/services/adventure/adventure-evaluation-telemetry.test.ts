import { describe, expect, it } from "vitest";
import {
  aggregateEvaluationTelemetry,
  buildFailedTurnTelemetry,
  buildGeneratedTurnTelemetry,
  emptyTelemetry,
} from "./adventure-evaluation-telemetry";
import {
  completeProposal,
  makeEvaluation,
  makePreparedStep,
  rollProposal,
} from "./adventure-evaluation.fixtures";

describe("adventure evaluation telemetry", () => {
  it("sums usage and duration while keeping peak prompt sizes and ordered turns", () => {
    const first = buildFailedTurnTelemetry(makePreparedStep(), 1, {});
    const second = { ...first, turn: 2 };
    const result = aggregateEvaluationTelemetry([
      {
        ...emptyTelemetry(),
        modelCalls: 1,
        retrievalHydrations: 2,
        serializedStateChars: 50,
        generationInputChars: 100,
        durationMs: 5,
        expansionCount: 1,
        turns: [first],
      },
      {
        ...emptyTelemetry(),
        modelCalls: 2,
        retrievalHydrations: 3,
        serializedStateChars: 30,
        generationInputChars: 200,
        durationMs: 8,
        expansionCount: 2,
        turns: [second],
      },
    ]);
    expect(result).toEqual({
      modelCalls: 3,
      retrievalHydrations: 5,
      serializedStateChars: 50,
      generationInputChars: 200,
      durationMs: 13,
      expansionCount: 3,
      providerUsage: "unavailable",
      estimatedPrice: "unavailable",
      turns: [first, second],
    });
    expect(aggregateEvaluationTelemetry([])).toEqual(emptyTelemetry());
  });

  it("marks only requested signals as failed when generation is unavailable", () => {
    const prepared = makePreparedStep({
      contextMode: "reconstructed",
      step: {
        playerAction: "Inspect.",
        expectsUsefulNegativeFinding: true,
        providerHistoryReset: true,
      },
    });
    expect(
      buildFailedTurnTelemetry(prepared, 2, { reasoningEffort: "medium" }),
    ).toMatchObject({
      turn: 1,
      modelKey: "unknown",
      requestedEffort: "medium",
      actualEffort: "unknown",
      contextMode: "reconstructed",
      transport: "unknown",
      threadMode: "unknown",
      resetClassification: "scripted",
      generationAttempts: 2,
      committed: false,
      expectedSignals: { usefulNegativeFinding: false },
    });
  });

  it.each([
    [undefined, undefined, "unknown"],
    ["retained", "continued", "none"],
    ["reconstructed", "continued", "reconstructed"],
  ] as const)(
    "classifies context=%s and thread=%s as %s",
    (contextMode, threadMode, expected) => {
      const prepared = makePreparedStep({ contextMode });
      const proposal = Object.assign(completeProposal(), {
        generationInfo: { threadMode },
      });
      const telemetry = buildGeneratedTurnTelemetry(
        {
          prepared,
          attemptsMade: 1,
          proposal,
          evaluation: makeEvaluation({ proposal }),
          commit: {
            session: prepared.previousSession,
            failed: false,
            committed: false,
          },
        },
        {},
      );
      expect(telemetry.resetClassification).toBe(expected);
      expect(telemetry.modelKey).toBe("unknown");
      expect(telemetry).not.toHaveProperty("progressKind");
    },
  );

  it("reports rejected and pending-roll action resolution without a committed turn", () => {
    const prepared = makePreparedStep();
    const input = {
      prepared,
      attemptsMade: 1,
      proposal: completeProposal(),
      evaluation: makeEvaluation(),
      commit: {
        session: prepared.previousSession,
        failed: true,
        committed: false,
      },
    };
    expect(buildGeneratedTurnTelemetry(input, {}).actionResolution).toEqual({
      outcome: "unresolved",
      validation: "rejected",
      evidenceCategory: "rejected-turn",
    });
    const proposal = rollProposal();
    expect(
      buildGeneratedTurnTelemetry(
        { ...input, proposal, commit: { ...input.commit, failed: false } },
        {},
      ).actionResolution,
    ).toEqual({
      outcome: "roll-required",
      validation: "accepted",
      evidenceCategory: "roll-pending",
    });
  });
});
