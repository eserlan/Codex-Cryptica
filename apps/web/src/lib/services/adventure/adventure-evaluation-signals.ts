import {
  classifyTurnProgress,
  evaluateAdventureRun,
  type AdventureTurnProposal,
  type EvaluationTurn,
  type TurnProgressKind,
} from "@codex/adventure-engine";
import type { AdventureEvaluationStep } from "./adventure-evaluation-model";

const ACTIONABLE_PROGRESS_KINDS = new Set<TurnProgressKind>([
  "scenario-stage-or-status-change",
  "actionable-discovery",
  "obstacle-advanced-or-resolved",
  "causal-state-change",
  "consequential-player-choice",
  "useful-negative-finding",
]);

export function normalized(value: string): string {
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

export function evaluationProgressKind(
  evaluation: EvaluationTurn,
  committed: boolean,
): TurnProgressKind | undefined {
  if (!committed || !evaluation.session) return undefined;
  const turn = evaluation.session.turns.at(-1);
  if (!turn) return undefined;
  return classifyTurnProgress(turn, evaluation.session).kind;
}

export function hasSubstantiveAnswer(
  evaluation: EvaluationTurn,
  progressKind?: TurnProgressKind,
): boolean {
  return (
    evaluation.narration.trim().length >= 40 &&
    (progressKind !== "repeated-non-answer" || hasActionableRoute(evaluation))
  );
}

export function hasActionableRoute(evaluation: EvaluationTurn): boolean {
  const suggestionText =
    evaluation.proposal.kind === "complete"
      ? (evaluation.proposal.suggestedActions ?? []).join(" ")
      : (evaluation.proposal.suggestedActions ?? []).join(" ");
  return /\b(?:check|read|inspect|visit|ask|show|return|follow|compare|search|seek|look|take)\b.{0,100}\b(?:ledger|archive|tower|witness|clerk|record|rope|latch|market|bell)\b/i.test(
    `${evaluation.narration}\n${suggestionText}`,
  );
}

export function isActionableProgress(
  evaluation: EvaluationTurn,
  progressKind?: TurnProgressKind,
): boolean {
  return (
    (progressKind !== undefined &&
      ACTIONABLE_PROGRESS_KINDS.has(progressKind)) ||
    hasActionableRoute(evaluation)
  );
}

export function hasUsefulNegativeFinding(
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

export function isValidQuietOutcome(
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

export function expectedSignalsFor(
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

export function failedExpectedSignals(
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

export function npcKnowledgeViolationCount(
  step: AdventureEvaluationStep,
  evaluation: EvaluationTurn,
): number {
  if (!step.forbiddenNpcKnowledge?.length) return 0;
  const visible = normalized(visibleProposalText(evaluation.proposal));
  return step.forbiddenNpcKnowledge.filter((phrase) =>
    visible.includes(normalized(phrase)),
  ).length;
}
