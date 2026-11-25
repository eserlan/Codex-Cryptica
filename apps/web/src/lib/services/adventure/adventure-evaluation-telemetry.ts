import {
  canonSafetyFailures,
  consequenceCredibilityFailures,
  type evaluateAdventureRun,
  type ActionResolutionTrace,
  type AdventureSession,
  type EvaluationTurn,
  type GenerationThreadMode,
  type TurnProgressKind,
} from "@codex/adventure-engine";
import type { AdventureGenerationInfo } from "@codex/ai-engine";
import type {
  AdventureEvaluationTelemetry,
  AdventureEvaluationTurnTelemetry,
  AdventureEvaluationResetClassification,
  AdventureEvaluationRunnerOptions,
  AdventureEvaluationStep,
  CaseExecutionState,
  EvaluationProposal,
  PreparedEvaluationStep,
  EvaluationCommit,
} from "./adventure-evaluation-model";
import {
  expectedSignalsFor,
  failedExpectedSignals,
  npcKnowledgeViolationCount,
} from "./adventure-evaluation-signals";

export function emptyTelemetry(): AdventureEvaluationTelemetry {
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
  commit: EvaluationCommit,
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

function baseTurnTelemetry(
  prepared: PreparedEvaluationStep,
  attemptsMade: number,
  options: AdventureEvaluationRunnerOptions,
  generationInfo?: AdventureGenerationInfo,
) {
  const { step, index, contextMode } = prepared;
  return {
    turn: index + 1,
    modelKey: unknownWhenMissing(generationInfo?.modelKey),
    requestedEffort: unspecifiedWhenMissing(options.reasoningEffort),
    actualEffort: unknownWhenMissing(generationInfo?.reasoningEffort),
    contextMode: unspecifiedWhenMissing(contextMode),
    transport: unknownWhenMissing(generationInfo?.transport),
    threadMode: unknownWhenMissing(generationInfo?.threadMode),
    resetClassification: evaluationResetClassification(
      generationInfo,
      contextMode,
      step,
    ),
    generationAttempts: attemptsMade,
  };
}

export function buildFailedTurnTelemetry(
  prepared: PreparedEvaluationStep,
  attemptsMade: number,
  options: AdventureEvaluationRunnerOptions,
): AdventureEvaluationTurnTelemetry {
  return {
    ...baseTurnTelemetry(prepared, attemptsMade, options),
    committed: false,
    expectedSignals: failedExpectedSignals(prepared.step),
    npcKnowledgeViolations: 0,
  };
}

interface GeneratedTurnTelemetryInput {
  prepared: PreparedEvaluationStep;
  attemptsMade: number;
  proposal: EvaluationProposal;
  evaluation: EvaluationTurn;
  commit: EvaluationCommit;
  progressKind?: TurnProgressKind;
}

export function buildGeneratedTurnTelemetry(
  {
    prepared,
    attemptsMade,
    proposal,
    evaluation,
    commit,
    progressKind,
  }: GeneratedTurnTelemetryInput,
  options: AdventureEvaluationRunnerOptions,
): AdventureEvaluationTurnTelemetry {
  const { previousSession, step } = prepared;
  const committed = commit.committed;
  const generationInfo = generationInfoOf(proposal);
  const actionResolution = resolveTelemetryActionResolution(commit, proposal);
  const repeatedSuggestedActions = hasRepeatedSuggestions(
    previousSession,
    proposal,
  );
  return {
    ...baseTurnTelemetry(prepared, attemptsMade, options, generationInfo),
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
  };
}

export function aggregateEvaluationTelemetry(
  telemetries: AdventureEvaluationTelemetry[],
): AdventureEvaluationTelemetry {
  return telemetries.reduce<AdventureEvaluationTelemetry>(
    (acc, item) => ({
      modelCalls: acc.modelCalls + item.modelCalls,
      retrievalHydrations: acc.retrievalHydrations + item.retrievalHydrations,
      serializedStateChars: Math.max(
        acc.serializedStateChars,
        item.serializedStateChars,
      ),
      generationInputChars: Math.max(
        acc.generationInputChars,
        item.generationInputChars,
      ),
      durationMs: acc.durationMs + item.durationMs,
      expansionCount: acc.expansionCount + item.expansionCount,
      providerUsage: "unavailable",
      estimatedPrice: "unavailable",
      turns: [...acc.turns, ...item.turns],
    }),
    emptyTelemetry(),
  );
}

export function recordRubricTelemetry(
  state: CaseExecutionState,
  runScore: ReturnType<typeof evaluateAdventureRun>,
): void {
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
}

export function buildCaseTelemetry(
  state: CaseExecutionState,
  startedAt: number,
  expansionCount: number,
  now: () => number,
): AdventureEvaluationTelemetry {
  return {
    modelCalls: state.modelCalls,
    retrievalHydrations: state.retrievalHydrations,
    serializedStateChars: state.serializedStateChars,
    generationInputChars: state.generationInputChars,
    durationMs: Math.max(0, now() - startedAt),
    expansionCount,
    providerUsage: "unavailable",
    estimatedPrice: "unavailable",
    turns: state.turnTelemetry,
  };
}
