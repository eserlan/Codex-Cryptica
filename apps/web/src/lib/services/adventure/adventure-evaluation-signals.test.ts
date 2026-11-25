import { describe, expect, it } from "vitest";
import {
  evaluationProgressKind,
  expectedSignalsFor,
  failedExpectedSignals,
  hasActionableRoute,
  hasUsefulNegativeFinding,
  npcKnowledgeViolationCount,
} from "./adventure-evaluation-signals";
import {
  completeProposal,
  makeEvaluation,
} from "./adventure-evaluation.fixtures";

describe("adventure evaluation signals", () => {
  it("recognizes actionable suggestions while rejecting a repeated non-answer", () => {
    const evaluation = makeEvaluation({
      proposal: completeProposal({
        suggestedActions: ["Check the watch ledger."],
      }),
    });
    const step = {
      playerAction: "Ask about the bell.",
      expectsSubstantiveAnswer: true,
      expectsActionableProgression: true,
    };

    expect(hasActionableRoute(evaluation)).toBe(true);
    expect(
      expectedSignalsFor(step, evaluation, true, "repeated-non-answer"),
    ).toEqual({
      substantiveAnswer: true,
      actionableProgression: true,
    });
    expect(
      expectedSignalsFor(step, makeEvaluation(), true, "repeated-non-answer"),
    ).toEqual({
      substantiveAnswer: false,
      actionableProgression: false,
    });
  });

  it.each([
    ["The latch shows no signs of forced entry.", true],
    ["No visible marks appear around the lock.", true],
    ["The search turns up nothing in the box.", true],
    ["The rope and latch are visible from here.", false],
    ["No one at the market knows who rang the bell.", false],
  ])("scores grounded negative finding %s as %s", (narration, expected) => {
    const evaluation = makeEvaluation({ narration });
    expect(
      hasUsefulNegativeFinding(
        { playerAction: "Inspect the latch." },
        evaluation,
      ),
    ).toBe(expected);
    expect(
      hasUsefulNegativeFinding({ playerAction: "Wait." }, evaluation),
    ).toBe(false);
  });

  it("counts only requested signals and rejects quiet outcomes without a commit", () => {
    const step = { playerAction: "Rest.", quietOutcome: "peaceful" as const };
    expect(expectedSignalsFor(step, makeEvaluation(), true)).toEqual({
      quietOutcome: true,
    });
    expect(expectedSignalsFor(step, makeEvaluation(), false)).toEqual({
      quietOutcome: false,
    });
    expect(
      expectedSignalsFor({ playerAction: "Wait." }, makeEvaluation(), true),
    ).toEqual({});
    expect(
      failedExpectedSignals({ ...step, expectsSubstantiveAnswer: true }),
    ).toEqual({
      substantiveAnswer: false,
      quietOutcome: false,
    });
  });

  it("checks normalized player-visible knowledge without counting hidden patches", () => {
    const step = {
      playerAction: "Ask the clerk.",
      forbiddenNpcKnowledge: ["Secret Tunnel"],
    };
    const hidden = completeProposal({
      hiddenPatch: {
        secrets: {
          add: [{ text: "Secret Tunnel" }],
          update: [],
          removeIds: [],
        },
        gmThreads: { add: [], update: [], removeIds: [] },
      },
    });
    expect(
      npcKnowledgeViolationCount(step, makeEvaluation({ proposal: hidden })),
    ).toBe(0);
    expect(
      npcKnowledgeViolationCount(
        step,
        makeEvaluation({
          proposal: completeProposal({
            narration: "The SECRET  tunnel is beneath the square.",
          }),
        }),
      ),
    ).toBe(1);
    expect(
      npcKnowledgeViolationCount({ playerAction: "Ask." }, makeEvaluation()),
    ).toBe(0);
  });

  it("does not classify progress for uncommitted or absent turns", () => {
    expect(evaluationProgressKind(makeEvaluation(), false)).toBeUndefined();
    expect(evaluationProgressKind(makeEvaluation(), true)).toBeUndefined();
  });
});
