import {
  aggregateScores,
  evaluateAdventureRun,
  parseAdventureSession,
  type AdventureSession,
  type AdventureTurnProposal,
} from "@codex/adventure-engine";
import {
  ADVENTURE_EVALUATION_CONDITIONS,
  createCaseExecutionState,
  type AdventureEvaluationCase,
  type AdventureEvaluationCaseResult,
  type AdventureEvaluationCondition,
  type AdventureEvaluationConditionResult,
  type AdventureEvaluationResult,
  type AdventureEvaluationRunnerOptions,
  type AdventureEvaluationStep,
  type EvaluationGenerationService,
  type CaseExecutionState,
  type EvaluationProposal,
  type PreparedEvaluationStep,
  type GeneratedEvaluationProposal,
} from "./adventure-evaluation-model";
import { evaluationProgressKind } from "./adventure-evaluation-signals";
import { summarizeProgression } from "./adventure-evaluation-progression";
import {
  evaluationSteps,
  prepareEvaluationStep,
} from "./adventure-evaluation-context";
import {
  commitProposal,
  makeEvaluationTurn,
} from "./adventure-evaluation-turn";
import {
  aggregateEvaluationTelemetry,
  buildFailedTurnTelemetry,
  buildGeneratedTurnTelemetry,
  recordRubricTelemetry,
} from "./adventure-evaluation-telemetry";

export { ADVENTURE_EVALUATION_CONDITIONS } from "./adventure-evaluation-model";
export type {
  AdventureEvaluationStep,
  AdventureEvaluationCase,
  AdventureEvaluationTelemetry,
  AdventureEvaluationResetClassification,
  AdventureEvaluationTurnTelemetry,
  AdventureEvaluationCaseResult,
  AdventureEvaluationCondition,
  AdventureEvaluationConditionResult,
  AdventureEvaluationResult,
  AdventureEvaluationRunnerOptions,
} from "./adventure-evaluation-model";

function countExpansions(session: AdventureSession): number {
  return (
    (session.places?.length ?? 0) +
    (session.scenarioCollection?.items.length ?? 0) +
    (session.worldTime?.events.length ?? 0)
  );
}

export class AdventureEvaluationRunner {
  constructor(
    private readonly generation: EvaluationGenerationService,
    private readonly providers: string[] = ["default"],
    private readonly options: AdventureEvaluationRunnerOptions = {},
  ) {}

  async run(
    cases: AdventureEvaluationCase[],
  ): Promise<AdventureEvaluationResult[]> {
    const now = this.options.now ?? (() => Date.now());
    const commitNow =
      this.options.commitNow ?? (() => new Date(now()).toISOString());

    const runProvider = async (
      provider: string,
    ): Promise<AdventureEvaluationResult> => {
      const results: AdventureEvaluationCaseResult[] = [];
      for (const testCase of cases) {
        results.push(await this.runCase(testCase, provider, now, commitNow));
      }

      const telemetry = aggregateEvaluationTelemetry(
        results.map((result) => result.telemetry),
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
        passed: results.length > 0 && results.every((r) => r.passed),
        telemetry,
      };
    };

    if (this.options.getRetrievalHydrations) {
      const results: AdventureEvaluationResult[] = [];
      for (const provider of this.providers) {
        results.push(await runProvider(provider));
      }
      return results;
    }
    return Promise.all(this.providers.map(runProvider));
  }

  async runConditionMatrix(
    cases: AdventureEvaluationCase[],
    conditions: AdventureEvaluationCondition[] = ADVENTURE_EVALUATION_CONDITIONS,
  ): Promise<AdventureEvaluationConditionResult[]> {
    const results: AdventureEvaluationConditionResult[] = [];
    for (const condition of conditions) {
      const isolatedCases = cases.map((testCase) => {
        const isolatedCase = structuredClone(testCase);
        return {
          ...isolatedCase,
          session: parseAdventureSession({
            ...isolatedCase.session,
            // Each transport arm owns an isolated provider thread.
            id: `${testCase.session.id}-eval-${condition.reasoningEffort}-${condition.directorEnabled ? "director" : "control"}-${condition.contextMode}`,
          }),
        };
      });
      const runner = new AdventureEvaluationRunner(
        this.generation,
        [condition.modelName],
        {
          ...this.options,
          directorEnabled: condition.directorEnabled,
          reasoningEffort: condition.reasoningEffort,
          contextMode: condition.contextMode,
        },
      );
      results.push({ condition, results: await runner.run(isolatedCases) });
    }
    return results;
  }

  private async runCase(
    testCase: AdventureEvaluationCase,
    provider: string,
    now: () => number,
    commitNow: () => string,
  ): Promise<AdventureEvaluationCaseResult> {
    const startedAt = now();
    const initialExpansions = countExpansions(testCase.session);
    const state = createCaseExecutionState(testCase.session);
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
      if (state.executionFailures.length > 0) break;
    }

    const runScore = evaluateAdventureRun(
      state.evaluatedTurns,
      testCase.canaries,
    );
    recordRubricTelemetry(state, runScore);
    const progression = summarizeProgression(state);
    const scores = {
      ...runScore.scores,
      ...(state.executionFailures.some(
        (failure) => failure.kind === "generation",
      )
        ? { continuity: 0 }
        : {}),
    };
    const expansionCount = Math.max(
      0,
      countExpansions(state.currentSession) - initialExpansions,
    );

    return {
      id: testCase.id,
      ...scores,
      passed:
        runScore.passed &&
        state.executionFailures.length === 0 &&
        progression.expectedSignalsFailed === 0 &&
        progression.causalConsistencyFailures === 0 &&
        progression.npcKnowledgeViolations === 0,
      progression,
      executionFailures: state.executionFailures,
      telemetry: {
        modelCalls: state.modelCalls,
        retrievalHydrations: state.retrievalHydrations,
        serializedStateChars: state.serializedStateChars,
        generationInputChars: state.generationInputChars,
        durationMs: Math.max(0, now() - startedAt),
        expansionCount,
        providerUsage: "unavailable",
        estimatedPrice: "unavailable",
        turns: state.turnTelemetry,
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
    const prepared = await prepareEvaluationStep(
      testCase,
      provider,
      step,
      index,
      state,
      { generation: this.generation, options: this.options },
    );
    const generated = await this.generateEvaluationProposal(prepared, state);
    if (!generated.proposal) {
      state.executionFailures.push({
        turn: prepared.index + 1,
        kind: "generation",
      });
      state.turnTelemetry.push(
        buildFailedTurnTelemetry(
          prepared,
          generated.attemptsMade,
          this.options,
        ),
      );
      return;
    }
    this.recordGeneratedEvaluation(
      testCase,
      prepared,
      generated,
      commitNow,
      state,
    );
  }

  private async generateEvaluationProposal(
    prepared: PreparedEvaluationStep,
    state: CaseExecutionState,
  ): Promise<GeneratedEvaluationProposal> {
    const maxAttempts = prepared.step.retryOnGenerationFailure ? 2 : 1;
    let proposal: EvaluationProposal | undefined;
    let attemptsMade = 0;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) {
        state.retryAttempts += 1;
        prepared.clearInteraction();
      }
      state.modelCalls += 1;
      attemptsMade += 1;
      try {
        proposal = await this.generation.generate(
          prepared.request,
          prepared.generationOptions,
        );
        break;
      } catch {
        prepared.clearInteraction();
      }
    }
    return { proposal, attemptsMade };
  }

  private recordGeneratedEvaluation(
    testCase: AdventureEvaluationCase,
    prepared: PreparedEvaluationStep,
    generated: GeneratedEvaluationProposal,
    commitNow: () => string,
    state: CaseExecutionState,
  ): void {
    const proposal = generated.proposal;
    if (!proposal) return;
    const { previousSession, step, index, anchors, relevant } = prepared;
    const commit = commitProposal(
      previousSession,
      proposal,
      testCase,
      step,
      index,
      commitNow,
    );
    const evaluation = makeEvaluationTurn(
      testCase,
      step,
      proposal,
      previousSession,
      commit.session,
      commit.failed,
      anchors,
      relevant,
    );
    const progressKind = evaluationProgressKind(evaluation, commit.committed);
    state.evaluatedTurns.push(evaluation);
    state.executedTurns.push({
      turn: index + 1,
      step,
      evaluation,
      committed: commit.committed,
      progressKind,
    });
    state.currentSession = commit.session;
    state.turnTelemetry.push(
      buildGeneratedTurnTelemetry(
        {
          prepared,
          attemptsMade: generated.attemptsMade,
          proposal,
          evaluation,
          commit,
          progressKind,
        },
        this.options,
      ),
    );
    this.finalizeGeneratedInteraction(prepared, commit, proposal, state);
  }

  private finalizeGeneratedInteraction(
    prepared: PreparedEvaluationStep,
    commit: ReturnType<typeof commitProposal>,
    proposal: EvaluationProposal,
    state: CaseExecutionState,
  ): void {
    const { previousSession, index, clearInteraction } = prepared;
    if (commit.failed) {
      state.executionFailures.push({ turn: index + 1, kind: "commit" });
      clearInteraction();
      return;
    }
    if (
      commit.committed &&
      proposal.generationInfo?.transport === "interaction"
    ) {
      this.generation.confirmInteraction?.(
        previousSession.id,
        commit.session.revision,
      );
      return;
    }
    // Roll-required, stateless and unknown transports are not promoted into
    // a retained provider thread by this benchmark.
    clearInteraction();
  }
}

export const adventureEvaluationRunner = new AdventureEvaluationRunner({
  async generate(): Promise<AdventureTurnProposal> {
    throw new Error(
      "Configure an AdventureTurnGenerationService before running evaluations.",
    );
  },
});
