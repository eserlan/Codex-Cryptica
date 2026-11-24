import {
  aggregateScores,
  applyCompletedTurn,
  buildAdventurePrompt,
  buildAdventureRecap,
  canonSafetyFailures,
  classifyTurnProgress,
  consequenceCredibilityFailures,
  createPlayerTranscript,
  evaluateAdventureRun,
  parseAdventureSession,
  resolveRecordedRoll,
  type AdventureSession,
  type AdventureTurnProposal,
  type EvaluationTurn,
  type GenerationResetReason,
  type GenerationThreadMode,
  type TurnProgressKind,
  type ResolvedSourceExcerpt,
  type RubricScores,
} from "@codex/adventure-engine";
import type {
  AdventureGenerationInfo,
  AdventureTurnGenerationService,
} from "@codex/ai-engine";
import type { AdventureGroundingService } from "./adventure-grounding-service";

export interface AdventureEvaluationStep {
  playerAction: string;
  phase?: "opening" | "action" | "roll-resolution";
  anchors?: ResolvedSourceExcerpt[];
  relevant?: ResolvedSourceExcerpt[];
  canaries?: string[];
  gmOnlyLore?: string[];
  expectsSubstantiveAnswer?: boolean;
  expectsActionableProgression?: boolean;
  expectsUsefulNegativeFinding?: boolean;
  quietOutcome?: "peaceful" | "exhausted";
  forbiddenNpcKnowledge?: string[];
  /** Simulates reloading local committed state with an empty provider thread. */
  providerHistoryReset?: boolean;
  /** Explicitly retry the same action once after a provider generation error. */
  retryOnGenerationFailure?: boolean;
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
  providerUsage: "unavailable";
  estimatedPrice: "unavailable";
  turns: AdventureEvaluationTurnTelemetry[];
}

export type AdventureEvaluationResetClassification =
  GenerationResetReason | "none" | "scripted" | "reconstructed" | "unknown";

export interface AdventureEvaluationTurnTelemetry {
  turn: number;
  modelKey: string;
  requestedEffort: "low" | "medium" | "high" | "xhigh" | "unspecified";
  actualEffort: "low" | "medium" | "high" | "xhigh" | "unknown";
  contextMode: "retained" | "reconstructed" | "unspecified";
  transport: "interaction" | "stateless" | "unknown";
  threadMode: GenerationThreadMode | "unknown";
  resetClassification: AdventureEvaluationResetClassification;
  generationAttempts: number;
  committed: boolean;
  progressKind?: TurnProgressKind;
  expectedSignals: {
    substantiveAnswer?: boolean;
    actionableProgression?: boolean;
    usefulNegativeFinding?: boolean;
    quietOutcome?: boolean;
  };
  npcKnowledgeViolations: number;
  rubrics?: RubricScores;
  rubricFailures?: string[];
  canonFailures?: string[];
  consequenceFailures?: string[];
}

export interface AdventureEvaluationCaseResult extends RubricScores {
  id: string;
  passed: boolean;
  telemetry: AdventureEvaluationTelemetry;
  progression: {
    meaningfulAdvancement: number;
    committedTurns: number;
    substantiveAnswers: number;
    actionableProgression: number;
    usefulNegativeFindings: number;
    causalStateChanges: number;
    committedFactReuse: number;
    causalConsistencyChecks: number;
    causalConsistencyFailures: number;
    npcKnowledgeChecks: number;
    npcKnowledgeViolations: number;
    validQuietOutcomes: number;
    repeatedNonAnswers: number;
    agencyPreserved: number;
    expectedSignalsMet: number;
    expectedSignalsFailed: number;
    retryAttempts: number;
  };
  executionFailures: Array<{ turn: number; kind: "generation" | "commit" }>;
}

export interface AdventureEvaluationCondition {
  modelName: string;
  reasoningEffort: "low" | "medium";
  directorEnabled: boolean;
  contextMode: "retained" | "reconstructed";
}

export const ADVENTURE_EVALUATION_CONDITIONS: AdventureEvaluationCondition[] = (
  ["low", "medium"] as const
).flatMap((reasoningEffort) =>
  ([false, true] as const).flatMap((directorEnabled) =>
    (["retained", "reconstructed"] as const).map((contextMode) => ({
      modelName: "luna-fast",
      reasoningEffort,
      directorEnabled,
      contextMode,
    })),
  ),
);

export interface AdventureEvaluationConditionResult {
  condition: AdventureEvaluationCondition;
  results: AdventureEvaluationResult[];
}

export interface AdventureEvaluationResult extends RubricScores {
  provider: string;
  cases: AdventureEvaluationCaseResult[];
  passed: boolean;
  telemetry: AdventureEvaluationTelemetry;
}

export interface AdventureEvaluationRunnerOptions {
  /** QA treatment only; production generation remains Director-on. */
  directorEnabled?: boolean;
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  contextMode?: "retained" | "reconstructed";
  grounding?: Pick<AdventureGroundingService, "prepare">;
  now?: () => number;
  getRetrievalHydrations?: () => number;
  commitNow?: () => string;
}

type EvaluationGenerationService = Pick<
  AdventureTurnGenerationService,
  "generate"
> &
  Partial<
    Pick<
      AdventureTurnGenerationService,
      "confirmInteraction" | "clearInteraction"
    >
  >;

function countExpansions(session: AdventureSession): number {
  return (
    (session.places?.length ?? 0) +
    (session.scenarioCollection?.items.length ?? 0) +
    (session.worldTime?.events.length ?? 0)
  );
}

function hasMeaningfulScenarioProgress(turn: EvaluationTurn): boolean {
  const before = turn.previousSession?.scenarioCollection?.items ?? [];
  const after = turn.session?.scenarioCollection?.items ?? [];
  const previous = new Map(before.map((item) => [item.id, item]));
  return after.some((item) => {
    const old = previous.get(item.id);
    return Boolean(
      old &&
      (old.stage !== item.stage ||
        old.status !== item.status ||
        old.events.length < item.events.length),
    );
  });
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

interface CaseExecutionState {
  currentSession: AdventureSession;
  evaluatedTurns: EvaluationTurn[];
  modelCalls: number;
  retrievalHydrations: number;
  serializedStateChars: number;
  generationInputChars: number;
  turnTelemetry: AdventureEvaluationTurnTelemetry[];
  executionFailures: Array<{ turn: number; kind: "generation" | "commit" }>;
  retryAttempts: number;
  executedTurns: Array<{
    turn: number;
    step: AdventureEvaluationStep;
    evaluation: EvaluationTurn;
    committed: boolean;
    progressKind?: TurnProgressKind;
  }>;
}

const ACTIONABLE_PROGRESS_KINDS = new Set<TurnProgressKind>([
  "scenario-stage-or-status-change",
  "actionable-discovery",
  "obstacle-advanced-or-resolved",
  "causal-state-change",
  "consequential-player-choice",
  "useful-negative-finding",
]);

function normalized(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function visibleProposalText(proposal: AdventureTurnProposal): string {
  if (proposal.kind !== "complete") return JSON.stringify(proposal);
  const {
    hiddenPatch: _hidden,
    causalCommitments: _commitments,
    timeAdvance: _timeAdvance,
    ...visible
  } = proposal;
  return `${proposal.narration}\n${JSON.stringify(visible)}`;
}

function hasCausalCommitmentReuse(evaluation: EvaluationTurn): boolean {
  const proposal = evaluation.proposal;
  const previous = evaluation.previousSession?.causalCommitments ?? [];
  if (proposal.kind !== "complete" || previous.length === 0) return false;
  return (proposal.causalCommitments ?? []).some((candidate) =>
    previous.some(
      (committed) =>
        committed.kind === candidate.kind &&
        committed.commitmentClass === candidate.commitmentClass &&
        normalized(committed.subject) === normalized(candidate.subject) &&
        normalized(committed.summary) === normalized(candidate.summary),
    ),
  );
}

function hasUnmarkedCausalConflict(evaluation: EvaluationTurn): boolean {
  const proposal = evaluation.proposal;
  const prior = evaluation.previousSession?.causalCommitments ?? [];
  if (proposal.kind !== "complete" || prior.length === 0) return false;
  return (proposal.causalCommitments ?? []).some(
    (candidate) =>
      !candidate.contested &&
      prior.some(
        (committed) =>
          committed.kind === candidate.kind &&
          committed.scenarioId === candidate.scenarioId &&
          normalized(committed.subject) === normalized(candidate.subject) &&
          normalized(committed.summary) !== normalized(candidate.summary),
      ),
  );
}

function causalCommitmentsPreserved(
  previous: AdventureSession | undefined,
  next: AdventureSession | undefined,
): boolean {
  const prior = previous?.causalCommitments ?? [];
  const current = new Map(
    (next?.causalCommitments ?? []).map((item) => [item.id, item]),
  );
  return prior.every((item) => {
    const retained = current.get(item.id);
    return Boolean(
      retained &&
      retained.kind === item.kind &&
      retained.commitmentClass === item.commitmentClass &&
      retained.subject === item.subject &&
      retained.summary === item.summary &&
      retained.scenarioId === item.scenarioId,
    );
  });
}

function evaluationProgressKind(
  evaluation: EvaluationTurn,
  committed: boolean,
): TurnProgressKind | undefined {
  if (!committed || !evaluation.session) return undefined;
  const turn = evaluation.session.turns.at(-1);
  if (!turn) return undefined;
  return classifyTurnProgress(turn, evaluation.session).kind;
}

function hasSubstantiveAnswer(
  evaluation: EvaluationTurn,
  progressKind?: TurnProgressKind,
): boolean {
  return (
    evaluation.narration.trim().length >= 40 &&
    (progressKind !== "repeated-non-answer" || hasActionableRoute(evaluation))
  );
}

function hasActionableRoute(evaluation: EvaluationTurn): boolean {
  const suggestionText =
    evaluation.proposal.kind === "complete"
      ? (evaluation.proposal.suggestedActions ?? []).join(" ")
      : (evaluation.proposal.suggestedActions ?? []).join(" ");
  return /\b(?:check|read|inspect|visit|ask|show|return|follow|compare|search|seek|look|take)\b.{0,100}\b(?:ledger|archive|tower|witness|clerk|record|rope|latch|market|bell)\b/i.test(
    `${evaluation.narration}\n${suggestionText}`,
  );
}

function isActionableProgress(
  evaluation: EvaluationTurn,
  progressKind?: TurnProgressKind,
): boolean {
  return (
    (progressKind !== undefined &&
      ACTIONABLE_PROGRESS_KINDS.has(progressKind)) ||
    hasActionableRoute(evaluation)
  );
}

function hasUsefulNegativeFinding(
  step: AdventureEvaluationStep,
  evaluation: EvaluationTurn,
  progressKind?: TurnProgressKind,
): boolean {
  if (progressKind === "useful-negative-finding") return true;
  if (
    evaluation.proposal.kind !== "complete" ||
    !/\b(?:inspect|examine|search|check|look|test|verify)\b/i.test(
      step.playerAction,
    )
  ) {
    return false;
  }
  const findingText = [
    ...evaluation.proposal.visiblePatch.knownFacts.add.map((fact) => fact.text),
    ...(evaluation.proposal.provisionalFacts ?? []).flatMap((fact) => [
      fact.name,
      fact.summary,
    ]),
    evaluation.narration,
  ].join(" ");
  return /\b(?:intact|undisturbed|empty|absent|unbroken|untouched|nothing\s+(?:in|inside|there|found)|(?:no|without)\s+(?:(?:clear|fresh|obvious|visible)\s+)?(?:signs?|traces?|marks?|evidence|entries|records?|clues?|breaks?|damage)(?:\s+of\b)?|nothing\s+(?:indicates?|suggests?)\b)\b/i.test(
    findingText,
  );
}

function isValidQuietOutcome(
  step: AdventureEvaluationStep,
  evaluation: EvaluationTurn,
  committed: boolean,
): boolean {
  if (
    !step.quietOutcome ||
    !committed ||
    evaluation.proposal.kind !== "complete"
  )
    return false;
  const addedObjectives = evaluation.proposal.visiblePatch.objectives.add;
  const scores = evaluateAdventureRun([evaluation], step.canaries ?? []).scores;
  return (
    addedObjectives.length === 0 &&
    scores.agency === 1 &&
    scores.unnecessaryEscalation === 1
  );
}

function expectedSignalsFor(
  step: AdventureEvaluationStep,
  evaluation: EvaluationTurn,
  committed: boolean,
  progressKind?: TurnProgressKind,
) {
  return {
    ...(step.expectsSubstantiveAnswer
      ? {
          substantiveAnswer: hasSubstantiveAnswer(evaluation, progressKind),
        }
      : {}),
    ...(step.expectsActionableProgression
      ? {
          actionableProgression: isActionableProgress(evaluation, progressKind),
        }
      : {}),
    ...(step.expectsUsefulNegativeFinding
      ? {
          usefulNegativeFinding: hasUsefulNegativeFinding(
            step,
            evaluation,
            progressKind,
          ),
        }
      : {}),
    ...(step.quietOutcome
      ? { quietOutcome: isValidQuietOutcome(step, evaluation, committed) }
      : {}),
  };
}

function failedExpectedSignals(
  step: AdventureEvaluationStep,
): ReturnType<typeof expectedSignalsFor> {
  return {
    ...(step.expectsSubstantiveAnswer ? { substantiveAnswer: false } : {}),
    ...(step.expectsActionableProgression
      ? { actionableProgression: false }
      : {}),
    ...(step.expectsUsefulNegativeFinding
      ? { usefulNegativeFinding: false }
      : {}),
    ...(step.quietOutcome ? { quietOutcome: false } : {}),
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

function npcKnowledgeViolationCount(
  step: AdventureEvaluationStep,
  evaluation: EvaluationTurn,
): number {
  if (!step.forbiddenNpcKnowledge?.length) return 0;
  const visible = normalized(visibleProposalText(evaluation.proposal));
  return step.forbiddenNpcKnowledge.filter((phrase) =>
    visible.includes(normalized(phrase)),
  ).length;
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

type ProgressionSummary = AdventureEvaluationCaseResult["progression"];
type EvaluationProposal = Awaited<
  ReturnType<AdventureTurnGenerationService["generate"]>
>;

interface PreparedEvaluationStep {
  previousSession: AdventureSession;
  step: AdventureEvaluationStep;
  index: number;
  contextMode: AdventureEvaluationRunnerOptions["contextMode"];
  request: Parameters<AdventureTurnGenerationService["generate"]>[0];
  generationOptions: Parameters<AdventureTurnGenerationService["generate"]>[1];
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  clearInteraction: () => void;
}

interface GeneratedEvaluationProposal {
  proposal?: EvaluationProposal;
  attemptsMade: number;
}

function emptyProgressionSummary(retryAttempts: number): ProgressionSummary {
  return {
    meaningfulAdvancement: 0,
    committedTurns: 0,
    substantiveAnswers: 0,
    actionableProgression: 0,
    usefulNegativeFindings: 0,
    causalStateChanges: 0,
    committedFactReuse: 0,
    causalConsistencyChecks: 0,
    causalConsistencyFailures: 0,
    npcKnowledgeChecks: 0,
    npcKnowledgeViolations: 0,
    validQuietOutcomes: 0,
    repeatedNonAnswers: 0,
    agencyPreserved: 0,
    expectedSignalsMet: 0,
    expectedSignalsFailed: 0,
    retryAttempts,
  };
}

function summarizeProgression(state: CaseExecutionState): ProgressionSummary {
  const progression = emptyProgressionSummary(state.retryAttempts);
  for (const executed of state.executedTurns) {
    accumulateTurnProgression(progression, executed);
  }
  return progression;
}

function accumulateTurnProgression(
  progression: ProgressionSummary,
  executed: CaseExecutionState["executedTurns"][number],
): void {
  accumulateBasicProgression(progression, executed);
  accumulateNpcKnowledgeProgression(progression, executed);
  accumulateCausalConsistencyProgression(progression, executed);
  accumulateRubricProgression(progression, executed);
  accumulateExpectedSignals(progression, executed);
}

function accumulateBasicProgression(
  progression: ProgressionSummary,
  {
    step,
    evaluation,
    committed,
    progressKind,
  }: CaseExecutionState["executedTurns"][number],
): void {
  progression.committedTurns += Number(committed);
  progression.meaningfulAdvancement += Number(
    hasMeaningfulScenarioProgress(evaluation),
  );
  progression.substantiveAnswers += Number(
    hasSubstantiveAnswer(evaluation, progressKind),
  );
  progression.actionableProgression += Number(
    isActionableProgress(evaluation, progressKind),
  );
  progression.usefulNegativeFindings += Number(
    hasUsefulNegativeFinding(step, evaluation, progressKind),
  );
  progression.causalStateChanges += Number(
    progressKind === "causal-state-change",
  );
  progression.repeatedNonAnswers += Number(
    progressKind === "repeated-non-answer" && !hasActionableRoute(evaluation),
  );
  progression.committedFactReuse += Number(
    hasCausalCommitmentReuse(evaluation),
  );
}

function accumulateNpcKnowledgeProgression(
  progression: ProgressionSummary,
  { step, evaluation }: CaseExecutionState["executedTurns"][number],
): void {
  progression.npcKnowledgeChecks += step.forbiddenNpcKnowledge?.length ?? 0;
  progression.npcKnowledgeViolations += npcKnowledgeViolationCount(
    step,
    evaluation,
  );
}

function accumulateCausalConsistencyProgression(
  progression: ProgressionSummary,
  { evaluation, committed }: CaseExecutionState["executedTurns"][number],
): void {
  const previous = evaluation.previousSession;
  const hasCommittedFacts = (previous?.causalCommitments?.length ?? 0) > 0;
  const shouldCheck = committed && hasCommittedFacts;
  progression.causalConsistencyChecks += Number(shouldCheck);
  progression.causalConsistencyFailures += Number(
    shouldCheck &&
      (!causalCommitmentsPreserved(previous, evaluation.session) ||
        hasUnmarkedCausalConflict(evaluation)),
  );
}

function accumulateRubricProgression(
  progression: ProgressionSummary,
  { step, evaluation, committed }: CaseExecutionState["executedTurns"][number],
): void {
  const scores = evaluateAdventureRun(
    [evaluation],
    evaluation.canaries ?? [],
  ).scores;
  progression.agencyPreserved += Number(scores.agency === 1);
  progression.validQuietOutcomes += Number(
    isValidQuietOutcome(step, evaluation, committed),
  );
}

function accumulateExpectedSignals(
  progression: ProgressionSummary,
  {
    step,
    evaluation,
    committed,
    progressKind,
  }: CaseExecutionState["executedTurns"][number],
): void {
  const signals = Object.values(
    expectedSignalsFor(step, evaluation, committed, progressKind),
  );
  const met = signals.filter(Boolean).length;
  progression.expectedSignalsMet += met;
  progression.expectedSignalsFailed += signals.length - met;
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
    const state: CaseExecutionState = {
      currentSession: testCase.session,
      evaluatedTurns: [],
      modelCalls: 0,
      retrievalHydrations: 0,
      serializedStateChars: 0,
      generationInputChars: 0,
      turnTelemetry: [],
      executionFailures: [],
      retryAttempts: 0,
      executedTurns: [],
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
      commit.committed,
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
    committed: boolean,
    progressKind: TurnProgressKind | undefined,
    state: CaseExecutionState,
  ): void {
    const { step, index, contextMode } = prepared;
    const generationInfo = generationInfoOf(proposal);
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

function commitProposal(
  session: AdventureSession,
  proposal: AdventureTurnProposal,
  testCase: AdventureEvaluationCase,
  step: AdventureEvaluationStep,
  index: number,
  commitNow: () => string,
): { session: AdventureSession; failed: boolean; committed: boolean } {
  if (proposal.kind !== "complete")
    return { session, failed: false, committed: false };
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
