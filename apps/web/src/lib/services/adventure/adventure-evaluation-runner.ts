import {
  aggregateScores,
  applyCompletedTurn,
  buildAdventurePrompt,
  buildAdventureRecap,
  createPlayerTranscript,
  evaluateAdventureRun,
  resolveRecordedRoll,
  type AdventureSession,
  type AdventureTurnProposal,
  type EvaluationTurn,
  type ResolvedSourceExcerpt,
  type RubricScores,
} from "@codex/adventure-engine";
import type { AdventureTurnGenerationService } from "@codex/ai-engine";
import type { AdventureGroundingService } from "./adventure-grounding-service";

export interface AdventureEvaluationStep {
  playerAction: string;
  phase?: "opening" | "action" | "roll-resolution";
  anchors?: ResolvedSourceExcerpt[];
  relevant?: ResolvedSourceExcerpt[];
  canaries?: string[];
  gmOnlyLore?: string[];
}

export interface AdventureEvaluationCase {
  id: string;
  session: AdventureSession;
  playerAction: string;
  playerCharacterName: string;
  canaries: string[];
  phase?: "opening" | "action" | "roll-resolution";
  anchors?: ResolvedSourceExcerpt[];
  relevant?: ResolvedSourceExcerpt[];
  gmOnlyLore?: string[];
  turns?: AdventureEvaluationStep[];
}

export interface AdventureEvaluationTelemetry {
  modelCalls: number;
  retrievalHydrations: number;
  serializedStateChars: number;
  generationInputChars: number;
  durationMs: number;
  expansionCount: number;
}

export interface AdventureEvaluationCaseResult extends RubricScores {
  id: string;
  passed: boolean;
  telemetry: AdventureEvaluationTelemetry;
}

export interface AdventureEvaluationResult extends RubricScores {
  provider: string;
  cases: AdventureEvaluationCaseResult[];
  passed: boolean;
  telemetry: AdventureEvaluationTelemetry;
}

export interface AdventureEvaluationRunnerOptions {
  grounding?: Pick<AdventureGroundingService, "prepare">;
  now?: () => number;
  getRetrievalHydrations?: () => number;
  commitNow?: () => string;
}

function countExpansions(session: AdventureSession): number {
  return (
    (session.places?.length ?? 0) +
    (session.scenarioCollection?.items.length ?? 0) +
    (session.worldTime?.events.length ?? 0)
  );
}

function emptyTelemetry(): AdventureEvaluationTelemetry {
  return {
    modelCalls: 0,
    retrievalHydrations: 0,
    serializedStateChars: 0,
    generationInputChars: 0,
    durationMs: 0,
    expansionCount: 0,
  };
}

interface CaseExecutionState {
  currentSession: AdventureSession;
  evaluatedTurns: EvaluationTurn[];
  modelCalls: number;
  retrievalHydrations: number;
  serializedStateChars: number;
  generationInputChars: number;
}

export class AdventureEvaluationRunner {
  constructor(
    private readonly generation: Pick<
      AdventureTurnGenerationService,
      "generate"
    >,
    private readonly providers: string[] = ["default"],
    private readonly options: AdventureEvaluationRunnerOptions = {},
  ) {}

  async run(
    cases: AdventureEvaluationCase[],
  ): Promise<AdventureEvaluationResult[]> {
    const now = this.options.now ?? (() => Date.now());
    const commitNow =
      this.options.commitNow ?? (() => new Date(now()).toISOString());

    return Promise.all(
      this.providers.map(async (provider) => {
        const results: AdventureEvaluationCaseResult[] = [];
        for (const testCase of cases) {
          results.push(await this.runCase(testCase, provider, now, commitNow));
        }

        const telemetry = results.reduce<AdventureEvaluationTelemetry>(
          (acc, item) => ({
            modelCalls: acc.modelCalls + item.telemetry.modelCalls,
            retrievalHydrations:
              acc.retrievalHydrations + item.telemetry.retrievalHydrations,
            serializedStateChars: Math.max(
              acc.serializedStateChars,
              item.telemetry.serializedStateChars,
            ),
            generationInputChars: Math.max(
              acc.generationInputChars,
              item.telemetry.generationInputChars,
            ),
            durationMs: acc.durationMs + item.telemetry.durationMs,
            expansionCount: acc.expansionCount + item.telemetry.expansionCount,
          }),
          emptyTelemetry(),
        );

        const agency = aggregateScores(results.map((r) => r.agency));
        const secrecy = aggregateScores(results.map((r) => r.secrecy));
        const continuity = aggregateScores(results.map((r) => r.continuity));
        const canonSafety = aggregateScores(results.map((r) => r.canonSafety));
        const consequenceCredibility = aggregateScores(
          results.map((r) => r.consequenceCredibility),
        );
        const unnecessaryEscalation = aggregateScores(
          results.map((r) => r.unnecessaryEscalation),
        );

        return {
          provider,
          cases: results,
          agency,
          secrecy,
          continuity,
          canonSafety,
          consequenceCredibility,
          unnecessaryEscalation,
          passed: results.every((r) => r.passed),
          telemetry,
        };
      }),
    );
  }

  private async runCase(
    testCase: AdventureEvaluationCase,
    provider: string,
    now: () => number,
    commitNow: () => string,
  ): Promise<AdventureEvaluationCaseResult> {
    const startedAt = now();
    const initialExpansions = countExpansions(testCase.session);
    const state: CaseExecutionState = {
      currentSession: testCase.session,
      evaluatedTurns: [],
      modelCalls: 0,
      retrievalHydrations: 0,
      serializedStateChars: 0,
      generationInputChars: 0,
    };
    const steps = evaluationSteps(testCase);
    for (const [index, step] of steps.entries()) {
      await this.runEvaluationStep(
        testCase,
        provider,
        step,
        index,
        commitNow,
        state,
      );
    }

    const runScore = evaluateAdventureRun(
      state.evaluatedTurns,
      testCase.canaries,
    );
    const expansionCount = Math.max(
      0,
      countExpansions(state.currentSession) - initialExpansions,
    );

    return {
      id: testCase.id,
      ...runScore.scores,
      passed: runScore.passed,
      telemetry: {
        modelCalls: state.modelCalls,
        retrievalHydrations: state.retrievalHydrations,
        serializedStateChars: state.serializedStateChars,
        generationInputChars: state.generationInputChars,
        durationMs: Math.max(0, now() - startedAt),
        expansionCount,
      },
    };
  }

  private async runEvaluationStep(
    testCase: AdventureEvaluationCase,
    provider: string,
    step: AdventureEvaluationStep,
    index: number,
    commitNow: () => string,
    state: CaseExecutionState,
  ): Promise<void> {
    const previousSession = state.currentSession;
    const phase = step.phase ?? "action";
    const { anchors, relevant, hydrations } = await this.resolveStepContext(
      previousSession,
      phase,
      step,
      testCase,
    );
    state.retrievalHydrations += hydrations;
    const prompt = buildAdventurePrompt({
      session: previousSession,
      phase,
      playerAction: step.playerAction,
      anchors,
      relevant,
    });
    state.serializedStateChars = Math.max(
      state.serializedStateChars,
      JSON.stringify(prompt.state).length,
    );
    state.generationInputChars = Math.max(
      state.generationInputChars,
      JSON.stringify(prompt).length,
    );
    state.modelCalls += 1;
    const proposal = await this.generation.generate(
      {
        session: previousSession,
        phase,
        playerAction: step.playerAction,
        anchors,
        relevant,
      },
      { modelName: provider },
    );
    const nextSession = commitProposal(
      previousSession,
      proposal,
      testCase,
      step,
      index,
      commitNow,
    );
    state.evaluatedTurns.push(
      makeEvaluationTurn(
        testCase,
        step,
        proposal,
        previousSession,
        nextSession,
        anchors,
        relevant,
      ),
    );
    state.currentSession = nextSession;
  }

  private async resolveStepContext(
    session: AdventureSession,
    phase: "opening" | "action" | "roll-resolution",
    step: AdventureEvaluationStep,
    testCase: AdventureEvaluationCase,
  ): Promise<{
    anchors: ResolvedSourceExcerpt[];
    relevant: ResolvedSourceExcerpt[];
    hydrations: number;
  }> {
    const supplied = suppliedContext(step, testCase);
    if (supplied) return supplied;
    if (!this.options.grounding) {
      return { anchors: [], relevant: [], hydrations: 0 };
    }
    const before = this.options.getRetrievalHydrations?.() ?? 0;
    const prepared = await this.options.grounding.prepare({
      purpose: groundingPurpose(phase),
      session,
      playerAction: step.playerAction,
    });
    const after = this.options.getRetrievalHydrations?.();
    return {
      anchors: prepared.anchors,
      relevant: prepared.relevant,
      hydrations:
        after !== undefined
          ? Math.max(0, after - before)
          : prepared.anchors.length + prepared.relevant.length,
    };
  }
}

function evaluationSteps(
  testCase: AdventureEvaluationCase,
): AdventureEvaluationStep[] {
  if (testCase.turns?.length) return testCase.turns;
  return [
    {
      playerAction: testCase.playerAction,
      phase: testCase.phase ?? "action",
      anchors: testCase.anchors,
      relevant: testCase.relevant,
      canaries: testCase.canaries,
      gmOnlyLore: testCase.gmOnlyLore,
    },
  ];
}

function suppliedContext(
  step: AdventureEvaluationStep,
  testCase: AdventureEvaluationCase,
):
  | {
      anchors: ResolvedSourceExcerpt[];
      relevant: ResolvedSourceExcerpt[];
      hydrations: number;
    }
  | undefined {
  if (
    !step.anchors &&
    !step.relevant &&
    !testCase.anchors &&
    !testCase.relevant
  )
    return undefined;
  return {
    anchors: step.anchors ?? testCase.anchors ?? [],
    relevant: step.relevant ?? testCase.relevant ?? [],
    hydrations: 0,
  };
}

function groundingPurpose(
  phase: "opening" | "action" | "roll-resolution",
): "opening" | "action" | "roll-resolution" {
  if (phase === "opening") return "opening";
  if (phase === "roll-resolution") return "roll-resolution";
  return "action";
}

function commitProposal(
  session: AdventureSession,
  proposal: AdventureTurnProposal,
  testCase: AdventureEvaluationCase,
  step: AdventureEvaluationStep,
  index: number,
  commitNow: () => string,
): AdventureSession {
  if (proposal.kind !== "complete") return session;
  const metadata = {
    turnId: `${testCase.id}-turn-${index + 1}`,
    inputId: `${testCase.id}-input-${index + 1}`,
    now: commitNow(),
    playerAction: step.playerAction,
  };
  const committed =
    step.phase === "roll-resolution"
      ? resolveRecordedRoll(session, proposal, metadata)
      : applyCompletedTurn(session, proposal, metadata);
  return committed.ok ? committed.value : session;
}

function makeEvaluationTurn(
  testCase: AdventureEvaluationCase,
  step: AdventureEvaluationStep,
  proposal: AdventureTurnProposal,
  previousSession: AdventureSession,
  session: AdventureSession,
  anchors: ResolvedSourceExcerpt[],
  relevant: ResolvedSourceExcerpt[],
): EvaluationTurn {
  return {
    narration:
      proposal.kind === "complete"
        ? proposal.narration
        : (proposal.setupNarration ?? ""),
    playerCharacterName: testCase.playerCharacterName,
    playerAction: step.playerAction,
    proposal,
    previousSession,
    session,
    canaries: step.canaries ?? testCase.canaries,
    gmOnlyLore: [
      ...(testCase.gmOnlyLore ?? []),
      ...(step.gmOnlyLore ?? []),
      ...anchors.flatMap((anchor) => (anchor.lore ? [anchor.lore] : [])),
      ...relevant.flatMap((excerpt) => (excerpt.lore ? [excerpt.lore] : [])),
    ],
    recap: buildAdventureRecap(session),
    transcript: createPlayerTranscript(session),
  };
}

export const adventureEvaluationRunner = new AdventureEvaluationRunner({
  async generate(): Promise<AdventureTurnProposal> {
    throw new Error(
      "Configure an AdventureTurnGenerationService before running evaluations.",
    );
  },
});
