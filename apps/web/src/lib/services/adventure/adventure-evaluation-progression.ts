import {
  evaluateAdventureRun,
  type AdventureSession,
  type EvaluationTurn,
} from "@codex/adventure-engine";
import type {
  CaseExecutionState,
  ProgressionSummary,
} from "./adventure-evaluation-model";
import {
  normalized,
  hasSubstantiveAnswer,
  hasActionableRoute,
  isActionableProgress,
  hasUsefulNegativeFinding,
  isValidQuietOutcome,
  expectedSignalsFor,
  npcKnowledgeViolationCount,
} from "./adventure-evaluation-signals";

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

export function summarizeProgression(
  state: CaseExecutionState,
): ProgressionSummary {
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
