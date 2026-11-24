import { describe, expect, it } from "bun:test";
import type { AdventureTurnProposal } from "@codex/adventure-engine";
import { ADVENTURE_EVALUATION_CONDITIONS } from "../apps/web/src/lib/services/adventure/adventure-evaluation-runner";
import { ADVENTURE_EVALUATION_CORPUS } from "./adventure-evaluation-corpus-fixtures";
import { prepareCorpusCase } from "./adventure-evaluation-corpus-builder";
import { evaluatePreparedCorpusCase } from "./adventure-evaluation-corpus-runner";
import {
  capturePlayerFacingOutputs,
  isFalseIntervention,
  markdownCorpusReport,
  pairedEvidenceStatus,
  type CapturedPlayerOutput,
  type CorpusCallMetrics,
  type CorpusCaseReport,
  type CorpusPathCoverage,
} from "./adventure-evaluation-corpus-report";

const emptyVisible = {
  objectives: { add: [], update: [], removeIds: [] },
  activeCharacters: { add: [], update: [], removeIds: [] },
  knownFacts: { add: [], update: [], removeIds: [] },
  relationships: { add: [], update: [], removeIds: [] },
};

const emptyHidden = {
  secrets: { add: [], update: [], removeIds: [] },
  gmThreads: { add: [], update: [], removeIds: [] },
};

function completeProposal(
  narration: string,
  revealSecretId?: string,
): Extract<AdventureTurnProposal, { kind: "complete" }> {
  return {
    kind: "complete",
    narration,
    visiblePatch: emptyVisible,
    hiddenPatch: emptyHidden,
    revealSecretIds: revealSecretId ? [revealSecretId] : [],
    provisionalFacts: [],
    sourceRecordIds: [],
  };
}

const metrics: CorpusCallMetrics = {
  modelCalls: 2,
  completedRequests: 2,
  failureClasses: [],
  latencyMs: 125,
  inputTokens: 300,
  outputTokens: 80,
  reasoningTokens: 20,
  estimatedPriceUsd: 0.00007,
};

function quietPath() {
  const fixture = ADVENTURE_EVALUATION_CORPUS[0]!;
  const path = fixture.paths.find((item) => item.id === "quiet-market-detour")!;
  return prepareCorpusCase(fixture, path, 1);
}

function quietNarration(
  prepared: ReturnType<typeof quietPath>,
  playerAction: string | undefined,
): string {
  const step = prepared.steps.find(
    (item) => item.playerAction === playerAction,
  )!;
  const evidence = step.expectedBeats
    .flatMap((beat) => beat.requiredEvidence)
    .join(". ");
  return `A calm moment unfolds: ${evidence}. The market remains peaceful.`;
}

function expectSuccessfulQuietReport(
  report: Awaited<ReturnType<typeof evaluatePreparedCorpusCase>>,
): void {
  const firstTurn = report.turns[0]!;
  expect(report.status).toBe("pass");
  expect(report.turns).toHaveLength(2);
  expect(firstTurn.playerFacingOutput).toContain("fish market");
  expect(firstTurn.authoredBeats[0]!.status).toBe("present");
  expect(firstTurn.rubrics!.secrecy).toBe(1);
  expect(firstTurn.progression!.committed).toBe(true);
  expect(report.progression.validQuietOutcomes).toBe(2);
  expect(report.metrics.inputTokens).toBe(300);
}

function expectRedactedCorpusReport(
  report: Awaited<ReturnType<typeof evaluatePreparedCorpusCase>>,
  hiddenText: string,
): void {
  const firstTurn = report.turns[0]!;
  const firstBeat = firstTurn.authoredBeats[0]!;
  expect(firstTurn.outputRedacted).toBe(true);
  expect(firstTurn.playerFacingOutput).toBe(
    "[redacted: secrecy hard gate failed]",
  );
  expect(firstBeat.status).toBe("absent");
  expect(firstBeat.label).toBe("[redacted: secrecy hard gate failed]");
  expect(firstBeat.id).toBe("redacted-beat-1");
  expect(JSON.stringify(report)).not.toContain(hiddenText);
  expect(report.rubrics.secrecy).toBe(0);
}

describe("adventure evaluation corpus reports", () => {
  it("captures successful turn output, beat coverage, gates, and progression separately", async () => {
    const prepared = quietPath();
    const generation = {
      async generate(request: { playerAction?: string }) {
        return completeProposal(quietNarration(prepared, request.playerAction));
      },
      clearInteraction: () => undefined,
      confirmInteraction: () => undefined,
    };
    const report = await evaluatePreparedCorpusCase(
      generation,
      prepared,
      ADVENTURE_EVALUATION_CONDITIONS[0]!,
      () => metrics,
    );
    expectSuccessfulQuietReport(report);
  });

  it("marks generation failure as blocked and the unreached authored beat absent", async () => {
    const prepared = quietPath();
    const report = await evaluatePreparedCorpusCase(
      { generate: async () => Promise.reject(new Error("proxy unavailable")) },
      prepared,
      ADVENTURE_EVALUATION_CONDITIONS[0]!,
      () => ({ ...metrics, modelCalls: 1, completedRequests: 0 }),
    );
    const firstTurn = report.turns[0]!;
    const secondTurn = report.turns[1]!;
    expect(report.status).toBe("blocked");
    expect(firstTurn.executionFailure).toBe("generation");
    expect(firstTurn.playerFacingOutput).toBe(
      "[no player-facing output generated]",
    );
    expect(firstTurn.authoredBeats[0]!.status).toBe("absent");
    expect(secondTurn.playerFacingOutput).toBe(
      "[no player-facing output generated]",
    );
    expect(report.traceSummary).toEqual({
      directorDeliveryCounts: { unknown: 1 },
      actionOutcomeCounts: { unknown: 1 },
      actionValidationCounts: { unknown: 1 },
      unknownTelemetryTurns: 1,
      repeatedUnchangedSuggestions: 0,
      falseInterventions: 0,
    });
    expect(
      markdownCorpusReport({
        generatedAt: "2026-11-24T00:00:00.000Z",
        samples: 1,
        evidence: pairedEvidenceStatus([], []),
        reports: [report],
      }),
    ).toMatch(
      /\| 2 \| .* \| .* \| .* \| not evaluated \| not reached \| not reached \| not reached \|/,
    );
  });

  it("counts a false intervention only when Director guidance was delivered", () => {
    const unresolvedWithRecovery = {
      recoveryReason: "dialogue",
    } as const;
    expect(
      isFalseIntervention(
        { ...unresolvedWithRecovery, status: "included" },
        "unresolved",
      ),
    ).toBe(true);
    expect(
      isFalseIntervention(
        { ...unresolvedWithRecovery, status: "truncated" },
        "unresolved",
      ),
    ).toBe(true);
    expect(
      isFalseIntervention(
        { ...unresolvedWithRecovery, status: "retained" },
        "unresolved",
      ),
    ).toBe(true);
    expect(
      isFalseIntervention(
        { ...unresolvedWithRecovery, status: "omitted" },
        "unresolved",
      ),
    ).toBe(false);
    expect(
      isFalseIntervention(
        { ...unresolvedWithRecovery, status: "unknown" },
        "unresolved",
      ),
    ).toBe(false);
    expect(
      isFalseIntervention(
        { recoveryReason: "none", status: "included" },
        "unresolved",
      ),
    ).toBe(false);
    expect(
      isFalseIntervention(
        { ...unresolvedWithRecovery, status: "included" },
        "resolved",
      ),
    ).toBe(false);
  });

  it("records scripted provider reset classification on the corrected return step", async () => {
    const fixture = ADVENTURE_EVALUATION_CORPUS[0]!;
    const path = fixture.paths[0]!;
    const resetStep = path.steps.find((step) => step.providerHistoryReset)!;
    const prepared = prepareCorpusCase(fixture, path, 1);
    const resetCase = {
      ...prepared,
      steps: [resetStep],
      testCase: {
        ...prepared.testCase,
        playerAction: resetStep.playerAction,
        turns: [resetStep],
      },
    };
    const generation = {
      async generate(_request: { playerAction?: string }) {
        const evidence = resetStep.expectedBeats
          .flatMap((beat) => beat.requiredEvidence)
          .join(". ");
        return completeProposal(
          `You review the record: ${evidence}. You can check the record at the quay office.`,
        );
      },
    };
    const report = await evaluatePreparedCorpusCase(
      generation,
      resetCase,
      ADVENTURE_EVALUATION_CONDITIONS[0]!,
      () => ({ ...metrics, modelCalls: 1, completedRequests: 1 }),
    );
    expect(report.turns[0]?.generation?.resetClassification).toBe("scripted");
    expect(report.turns[0]?.generation?.contextMode).toBe("retained");
  });

  it("keeps an explicitly earned revelation visible when its secret ID is revealed", async () => {
    const fixture = ADVENTURE_EVALUATION_CORPUS[1]!;
    const path = fixture.paths[0]!;
    const revealStep = path.steps.find((step) =>
      step.playerAction.startsWith("Lift the cloth"),
    )!;
    const prepared = prepareCorpusCase(fixture, path, 1);
    const revealCase = {
      ...prepared,
      steps: [revealStep],
      testCase: {
        ...prepared.testCase,
        playerAction: revealStep.playerAction,
        turns: [revealStep],
      },
    };
    const evidence = revealStep.expectedBeats
      .flatMap((beat) => beat.requiredEvidence)
      .join(". ");
    const report = await evaluatePreparedCorpusCase(
      {
        generate: async () =>
          completeProposal(
            `${evidence}. ${fixture.secretText}. You can check the record at the annex.`,
            fixture.secretId,
          ),
      },
      revealCase,
      ADVENTURE_EVALUATION_CONDITIONS[0]!,
      () => ({ ...metrics, modelCalls: 1, completedRequests: 1 }),
    );
    expect(report.turns[0]?.outputRedacted).toBe(false);
    expect(report.turns[0]?.playerFacingOutput).toContain(fixture.secretText);
    expect(report.turns[0]?.rubrics?.secrecy).toBe(1);
  });

  it("redacts player output and beat evidence when a secrecy hard gate fails", async () => {
    const fixture = ADVENTURE_EVALUATION_CORPUS[0]!;
    const prepared = prepareCorpusCase(fixture, fixture.paths[0]!, 1);
    const report = await evaluatePreparedCorpusCase(
      {
        generate: async () => completeProposal(fixture.secretText),
      },
      prepared,
      ADVENTURE_EVALUATION_CONDITIONS[0]!,
      () => metrics,
    );
    expectRedactedCorpusReport(report, fixture.secretText);
  });

  it("qualifies only when every path has three paired samples on two fixtures", () => {
    const template = {
      ...({} as CorpusCaseReport),
      fixtureId: "",
      pathId: "",
      sample: 0,
      condition: ADVENTURE_EVALUATION_CONDITIONS[0]!,
    } satisfies Partial<CorpusCaseReport>;
    const paths: CorpusPathCoverage[] = ADVENTURE_EVALUATION_CORPUS.map(
      (fixture) => ({
        fixtureId: fixture.id,
        pathIds: fixture.paths.map((path) => path.id),
      }),
    );
    const completePairs = ADVENTURE_EVALUATION_CORPUS.flatMap((fixture) =>
      fixture.paths.flatMap((path) =>
        [1, 2, 3].flatMap((sample) =>
          [false, true].map(
            (directorEnabled) =>
              ({
                ...template,
                fixtureId: fixture.id,
                pathId: path.id,
                sample,
                condition: { ...template.condition, directorEnabled },
              }) as CorpusCaseReport,
          ),
        ),
      ),
    );
    expect(
      pairedEvidenceStatus(completePairs, paths).eligibleForTreatmentClaim,
    ).toBe(true);
    expect(
      pairedEvidenceStatus(
        completePairs.filter((item) => !item.condition.directorEnabled),
        paths,
      ).eligibleForTreatmentClaim,
    ).toBe(false);
    expect(
      pairedEvidenceStatus(
        completePairs.filter((item) => item.sample < 3),
        paths,
      ).eligibleForTreatmentClaim,
    ).toBe(false);
  });

  it("states that the report is descriptive below the evidence threshold", () => {
    const evidence = pairedEvidenceStatus([], []);
    const markdown = markdownCorpusReport({
      generatedAt: "2026-11-24T00:00:00.000Z",
      samples: 1,
      evidence,
      reports: [],
    });
    expect(markdown).toContain("Descriptive only");
    expect(markdown).toContain("not a semantic judge");
  });

  it("renders model output as inert plain text in Markdown reports", async () => {
    const output = "![pixel](https://tracker.invalid/pixel) <img src=x>";
    const report = await evaluatePreparedCorpusCase(
      { generate: async () => completeProposal(output) },
      quietPath(),
      ADVENTURE_EVALUATION_CONDITIONS[0]!,
      () => metrics,
    );
    const markdown = markdownCorpusReport({
      generatedAt: "2026-11-24T00:00:00.000Z",
      samples: 1,
      evidence: pairedEvidenceStatus([], []),
      reports: [report],
    });
    expect(markdown).toContain(
      "\\!\\[pixel\\]\\(https://tracker\\.invalid/pixel\\)",
    );
    expect(markdown).toContain("&lt;img src=x&gt;");
    expect(markdown).not.toContain("![pixel](https://tracker.invalid/pixel)");
    expect(markdown).not.toContain("<img src=x>");
  });

  it("caps retained player-facing narration", async () => {
    const prepared = quietPath();
    const captured: CapturedPlayerOutput[] = [];
    const generation = capturePlayerFacingOutputs(
      { generate: async () => completeProposal("x".repeat(4_000)) },
      prepared.steps,
      captured,
    );
    await generation.generate({
      playerAction: prepared.steps[0]!.playerAction,
    } as Parameters<typeof generation.generate>[0]);
    const output = captured[0]!.text;
    expect(output).toContain("[truncated]");
    expect(output.length).toBeLessThan(2_050);
  });

  function stubbedTraceGenerate(prepared: ReturnType<typeof quietPath>) {
    let call = 0;
    return async () => {
      call += 1;
      const base = completeProposal(
        quietNarration(prepared, prepared.steps[call - 1]!.playerAction),
      );
      const suggestedActions: [string, string, string] = [
        "Wait",
        "Listen",
        "Stroll",
      ];
      if (call > 1) return { ...base, suggestedActions };
      return {
        ...base,
        suggestedActions,
        generationInfo: {
          transport: "interaction" as const,
          threadMode: "new" as const,
          directorDelivery: {
            status: "included" as const,
            reason: "delivered" as const,
            deliveredChars: 140,
            recoveryReason: "none" as const,
          },
        },
      };
    };
  }

  function assertTraceReport(
    report: Awaited<ReturnType<typeof evaluatePreparedCorpusCase>>,
    markdown: string,
  ): void {
    const firstGen = report.turns[0]!.generation!;
    const secondGen = report.turns[1]!.generation!;
    expect(firstGen.directorDelivery!.status).toBe("included");
    expect(firstGen.actionResolution).toMatchObject({
      outcome: "resolved",
      validation: "accepted",
      evidenceCategory: "quiet-play",
    });
    expect(secondGen.directorDelivery).toBeUndefined();
    expect(secondGen.actionResolution).toBeUndefined();
    expect(secondGen.repeatedSuggestedActions).toBe(true);
    expect(report.traceSummary).toEqual({
      directorDeliveryCounts: { included: 1, unknown: 1 },
      actionOutcomeCounts: { resolved: 1, unknown: 1 },
      actionValidationCounts: { accepted: 1, unknown: 1 },
      unknownTelemetryTurns: 1,
      repeatedUnchangedSuggestions: 1,
      falseInterventions: 0,
    });
    expect(markdown).toContain("Director / Action");
    expect(markdown).toContain("included / resolved/accepted");
    expect(markdown).toContain("unknown / unknown/unknown");
    expect(markdown).toContain(
      "missing telemetry is unknown, not a failed action",
    );
  }

  it("exposes #5195 Director delivery and #5196 action fulfilment traces separately from unknown legacy telemetry (#5197)", async () => {
    const prepared = quietPath();
    const report = await evaluatePreparedCorpusCase(
      { generate: stubbedTraceGenerate(prepared) },
      prepared,
      ADVENTURE_EVALUATION_CONDITIONS[0]!,
      () => metrics,
    );
    const markdown = markdownCorpusReport({
      generatedAt: "2026-11-24T00:00:00.000Z",
      samples: 1,
      evidence: pairedEvidenceStatus([], []),
      reports: [report],
    });
    assertTraceReport(report, markdown);
  });
});
