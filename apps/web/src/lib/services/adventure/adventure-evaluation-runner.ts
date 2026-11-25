import {
  aggregateScores,
  applyCompletedTurn,
  buildAdventurePrompt,
  buildAdventureRecap,
  canonSafetyFailures,
  consequenceCredibilityFailures,
  createPlayerTranscript,
  evaluateAdventureRun,
  parseAdventureSession,
  resolveRecordedRoll,
  type ActionResolutionTrace,
  type AdventureSession,
  type AdventureTurnProposal,
  type EvaluationTurn,
  type GenerationMetadata,
  type GenerationThreadMode,
  type TurnProgressKind,
  type ResolvedSourceExcerpt,
} from "@codex/adventure-engine";
import type { AdventureGenerationInfo } from "@codex/ai-engine";
import {
  ADVENTURE_EVALUATION_CONDITIONS,
  createCaseExecutionState,
  type AdventureEvaluationCase,
  type AdventureEvaluationCaseResult,
  type AdventureEvaluationCondition,
  type AdventureEvaluationConditionResult,
  type AdventureEvaluationResult,
  type AdventureEvaluationTelemetry,
  type AdventureEvaluationResetClassification,
  type AdventureEvaluationRunnerOptions,
  type AdventureEvaluationStep,
  type EvaluationGenerationService,
  type CaseExecutionState,
  type EvaluationProposal,
  type PreparedEvaluationStep,
  type GeneratedEvaluationProposal,
} from "./adventure-evaluation-model";
import {
  evaluationProgressKind,
  expectedSignalsFor,
  failedExpectedSignals,
  npcKnowledgeViolationCount,
} from "./adventure-evaluation-signals";
import { summarizeProgression } from "./adventure-evaluation-progression";

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

function emptyTelemetry(): AdventureEvaluationTelemetry {
  return {
    modelCalls: 0,
    retrievalHydrations: 0,
    serializedStateChars: 0,
    generationInputChars: 0,
    durationMs: 0,
    expansionCount: 0,
    providerUsage: "unavailable",
    estimatedPrice: "unavailable",
    turns: [],
  };
}

function generationInfoOf(
  proposal: EvaluationProposal,
): AdventureGenerationInfo {
  return proposal.generationInfo ?? ({} as AdventureGenerationInfo);
}

function unknownWhenMissing<T extends string>(
  value: T | undefined,
): T | "unknown" {
  return value ?? "unknown";
}

function unspecifiedWhenMissing<T extends string>(
  value: T | undefined,
): T | "unspecified" {
  return value ?? "unspecified";
}

function evaluationResetClassification(
  info: AdventureGenerationInfo | undefined,
  contextMode: AdventureEvaluationRunnerOptions["contextMode"],
  step: AdventureEvaluationStep,
): AdventureEvaluationResetClassification {
  if (step.providerHistoryReset) return "scripted";
  if (contextMode === "reconstructed") return "reconstructed";
  if (info?.resetReason) return info.resetReason;
  return resetClassificationForThread(info?.threadMode);
}

function resetClassificationForThread(
  threadMode: GenerationThreadMode | undefined,
): AdventureEvaluationResetClassification {
  if (threadMode === "new" || threadMode === "continued") return "none";
  return "unknown";
}

function resolveTelemetryActionResolution(
  commit: ReturnType<typeof commitProposal>,
  proposal: EvaluationProposal,
): ActionResolutionTrace | undefined {
  if (commit.committed) {
    return commit.session.turns.at(-1)?.generation?.actionResolution;
  }
  if (commit.failed) {
    return {
      outcome: "unresolved",
      validation: "rejected",
      evidenceCategory: "rejected-turn",
    };
  }
  if (proposal.kind === "roll-required") {
    return {
      outcome: "roll-required",
      validation: "accepted",
      evidenceCategory: "roll-pending",
    };
  }
  return undefined;
}

function hasRepeatedSuggestions(
  previousSession: AdventureSession,
  proposal: EvaluationProposal,
): boolean {
  const prev = previousSession.turns.at(-1)?.suggestedActions;
  const next = proposal.suggestedActions;
  if (!prev?.length || !next?.length || prev.length !== next.length) {
    return false;
  }
  return prev.every((item, idx) => item === next[idx]);
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
          providerUsage: "unavailable",
          estimatedPrice: "unavailable",
          turns: [...acc.turns, ...item.telemetry.turns],
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
    state.executedTurns.forEach((executed, index) => {
      const review = runScore.turns[index];
      const telemetry = state.turnTelemetry.find(
        (item) => item.turn === executed.turn,
      );
      if (review && telemetry) {
        telemetry.rubrics = review.scores;
        telemetry.rubricFailures = review.failures;
        telemetry.canonFailures = canonSafetyFailures(
          state.evaluatedTurns[index]!,
        );
        telemetry.consequenceFailures = consequenceCredibilityFailures(
          state.evaluatedTurns[index]!,
        );
      }
    });
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
    const prepared = await this.prepareEvaluationStep(
      testCase,
      provider,
      step,
      index,
      state,
    );
    const generated = await this.generateEvaluationProposal(prepared, state);
    if (!generated.proposal) {
      this.recordGenerationFailure(prepared, generated.attemptsMade, state);
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

  private async prepareEvaluationStep(
    testCase: AdventureEvaluationCase,
    provider: string,
    step: AdventureEvaluationStep,
    index: number,
    state: CaseExecutionState,
  ): Promise<PreparedEvaluationStep> {
    const previousSession = state.currentSession;
    const phase = step.phase ?? "action";
    const context = await this.resolveStepContext(
      previousSession,
      phase,
      step,
      testCase,
    );
    state.retrievalHydrations += context.hydrations;
    this.recordPromptSizes(previousSession, step, phase, context, state);
    const request: PreparedEvaluationStep["request"] = {
      session: previousSession,
      phase,
      playerAction: step.playerAction,
      anchors: context.anchors,
      relevant: context.relevant,
      ...(this.options.directorEnabled === undefined
        ? {}
        : { directorEnabled: this.options.directorEnabled }),
      ...(this.options.contextMode === undefined
        ? {}
        : { contextMode: this.options.contextMode }),
    };
    const clearInteraction = () =>
      this.generation.clearInteraction?.(previousSession.id);
    if (
      this.options.contextMode === "reconstructed" ||
      step.providerHistoryReset
    ) {
      clearInteraction();
    }
    return {
      previousSession,
      step,
      index,
      contextMode: this.options.contextMode,
      request,
      generationOptions: {
        modelName: provider,
        ...(this.options.reasoningEffort
          ? { reasoningEffort: this.options.reasoningEffort }
          : {}),
      },
      anchors: context.anchors,
      relevant: context.relevant,
      clearInteraction,
    };
  }

  private recordPromptSizes(
    session: AdventureSession,
    step: AdventureEvaluationStep,
    phase: "opening" | "action" | "roll-resolution",
    context: {
      anchors: ResolvedSourceExcerpt[];
      relevant: ResolvedSourceExcerpt[];
    },
    state: CaseExecutionState,
  ): void {
    const prompt = buildAdventurePrompt({
      session,
      phase,
      playerAction: step.playerAction,
      anchors: context.anchors,
      relevant: context.relevant,
      ...(this.options.directorEnabled === undefined
        ? {}
        : { directorEnabled: this.options.directorEnabled }),
    });
    state.serializedStateChars = Math.max(
      state.serializedStateChars,
      JSON.stringify(prompt.state).length,
    );
    state.generationInputChars = Math.max(
      state.generationInputChars,
      JSON.stringify(prompt).length,
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

  private recordGenerationFailure(
    prepared: PreparedEvaluationStep,
    attemptsMade: number,
    state: CaseExecutionState,
  ): void {
    const { step, index, contextMode } = prepared;
    state.executionFailures.push({ turn: index + 1, kind: "generation" });
    state.turnTelemetry.push({
      turn: index + 1,
      modelKey: "unknown",
      requestedEffort: this.options.reasoningEffort ?? "unspecified",
      actualEffort: "unknown",
      contextMode: contextMode ?? "unspecified",
      transport: "unknown",
      threadMode: "unknown",
      resetClassification: evaluationResetClassification(
        undefined,
        contextMode,
        step,
      ),
      generationAttempts: attemptsMade,
      committed: false,
      expectedSignals: failedExpectedSignals(step),
      npcKnowledgeViolations: 0,
    });
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
    this.recordGeneratedTelemetry(
      prepared,
      generated.attemptsMade,
      proposal,
      evaluation,
      commit,
      progressKind,
      state,
    );
    this.finalizeGeneratedInteraction(prepared, commit, proposal, state);
  }

  private recordGeneratedTelemetry(
    prepared: PreparedEvaluationStep,
    attemptsMade: number,
    proposal: EvaluationProposal,
    evaluation: EvaluationTurn,
    commit: ReturnType<typeof commitProposal>,
    progressKind: TurnProgressKind | undefined,
    state: CaseExecutionState,
  ): void {
    const { previousSession, step, index, contextMode } = prepared;
    const committed = commit.committed;
    const generationInfo = generationInfoOf(proposal);
    const actionResolution = resolveTelemetryActionResolution(commit, proposal);
    const repeatedSuggestedActions = hasRepeatedSuggestions(
      previousSession,
      proposal,
    );
    state.turnTelemetry.push({
      turn: index + 1,
      modelKey: unknownWhenMissing(generationInfo.modelKey),
      requestedEffort: unspecifiedWhenMissing(this.options.reasoningEffort),
      actualEffort: unknownWhenMissing(generationInfo.reasoningEffort),
      contextMode: unspecifiedWhenMissing(contextMode),
      transport: unknownWhenMissing(generationInfo.transport),
      threadMode: unknownWhenMissing(generationInfo.threadMode),
      resetClassification: evaluationResetClassification(
        generationInfo,
        contextMode,
        step,
      ),
      generationAttempts: attemptsMade,
      committed,
      ...(progressKind ? { progressKind } : {}),
      ...(generationInfo.directorDelivery
        ? { directorDelivery: generationInfo.directorDelivery }
        : {}),
      ...(actionResolution ? { actionResolution } : {}),
      ...(repeatedSuggestedActions ? { repeatedSuggestedActions: true } : {}),
      expectedSignals: expectedSignalsFor(
        step,
        evaluation,
        committed,
        progressKind,
      ),
      npcKnowledgeViolations: npcKnowledgeViolationCount(step, evaluation),
    });
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
  if (testCase.turns?.length) {
    return testCase.turns.map((step) => ({
      ...step,
      phase: step.phase ?? testCase.phase,
    }));
  }
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

const GENERATION_METADATA_KEYS = [
  "modelKey",
  "reasoningEffort",
  "transport",
  "threadMode",
  "resetReason",
  "directorDelivery",
  "requestChars",
  "sourceCounts",
  "scenarioIds",
] as const;

function generationMetadataFromInfo(
  info: AdventureGenerationInfo | undefined,
): GenerationMetadata | undefined {
  if (!info) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of GENERATION_METADATA_KEYS) {
    if (info[key] !== undefined) out[key] = info[key];
  }
  return out as GenerationMetadata;
}

function commitProposal(
  session: AdventureSession,
  proposal: EvaluationProposal,
  testCase: AdventureEvaluationCase,
  step: AdventureEvaluationStep,
  index: number,
  commitNow: () => string,
): { session: AdventureSession; failed: boolean; committed: boolean } {
  if (proposal.kind !== "complete")
    return { session, failed: false, committed: false };
  const generation = generationMetadataFromInfo(proposal.generationInfo);
  const metadata = {
    turnId: `${testCase.id}-turn-${index + 1}`,
    inputId: `${testCase.id}-input-${index + 1}`,
    now: commitNow(),
    playerAction: step.playerAction,
    ...(generation ? { generation } : {}),
  };
  const committed =
    step.phase === "roll-resolution"
      ? resolveRecordedRoll(session, proposal, metadata)
      : applyCompletedTurn(session, proposal, metadata);
  return committed.ok
    ? { session: committed.value, failed: false, committed: true }
    : { session, failed: true, committed: false };
}

function makeEvaluationTurn(
  testCase: AdventureEvaluationCase,
  step: AdventureEvaluationStep,
  proposal: AdventureTurnProposal,
  previousSession: AdventureSession,
  session: AdventureSession,
  commitFailed: boolean,
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
    ...(commitFailed ? { commitFailed: true } : {}),
    previousSession,
    session,
    canaries: [
      ...(step.canaries ?? testCase.canaries),
      ...(step.forbiddenNpcKnowledge ?? []),
    ],
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
