import { describe, expect, it } from "bun:test";
import { ADVENTURE_EVALUATION_CORPUS } from "./adventure-evaluation-corpus-fixtures";
import { prepareAdventureEvaluationCorpus } from "./adventure-evaluation-corpus-builder";

function allStepsHaveExpectedBeats(
  item: ReturnType<typeof prepareAdventureEvaluationCorpus>[number],
): boolean {
  return item.steps.every((step) => step.expectedBeats.length > 0);
}

describe("synthetic adventure evaluation corpus", () => {
  it("contains two distinct fixtures with multiple paths and quiet exits", () => {
    expect(ADVENTURE_EVALUATION_CORPUS).toHaveLength(2);
    expect(
      new Set(ADVENTURE_EVALUATION_CORPUS.map((fixture) => fixture.sceneType))
        .size,
    ).toBe(2);
    for (const fixture of ADVENTURE_EVALUATION_CORPUS) {
      expect(fixture.paths.length).toBeGreaterThanOrEqual(2);
      expect(fixture.hardFailureLabels.length).toBeGreaterThan(0);
      expect(fixture.paths.every((path) => path.steps.length > 0)).toBe(true);
      expect(
        fixture.paths.some((path) =>
          path.steps.some((step) => step.quietOutcome),
        ),
      ).toBe(true);
    }
  });

  it("prepares isolated runner cases with authored beats separated from actions", () => {
    const first = prepareAdventureEvaluationCorpus(1);
    const second = prepareAdventureEvaluationCorpus(2);
    expect(first).toHaveLength(4);
    expect(first.every(allStepsHaveExpectedBeats)).toBe(true);
    const firstCase = first[0]!;
    const secondCase = second[0]!;
    expect(firstCase.testCase.turns?.[0]).not.toHaveProperty("expectedBeats");
    expect(firstCase.testCase.session.id).not.toBe(
      secondCase.testCase.session.id,
    );
    expect(
      firstCase.testCase.session.scenarioCollection!.items[0]!.gmOnly.truth,
    ).toBe(ADVENTURE_EVALUATION_CORPUS[0]!.truth);
    expect(firstCase.testCase.session.hiddenState.secrets[0]!.text).toBe(
      ADVENTURE_EVALUATION_CORPUS[0]!.secretText,
    );
  });

  it("covers interviews, uncertain testimony, clue inspection, corrections, and reset recovery", () => {
    const steps = ADVENTURE_EVALUATION_CORPUS.flatMap((fixture) =>
      fixture.paths.flatMap((path) => path.steps),
    );
    expect(steps.some((step) => step.forbiddenNpcKnowledge?.length)).toBe(true);
    expect(steps.some((step) => step.providerHistoryReset)).toBe(true);
    expect(
      steps.some((step) => /inspect|cracked pane/i.test(step.playerAction)),
    ).toBe(true);
    expect(
      steps.some((step) => /I meant|not the/i.test(step.playerAction)),
    ).toBe(true);
    expect(steps.some((step) => step.expectsUsefulNegativeFinding)).toBe(true);
  });
});
