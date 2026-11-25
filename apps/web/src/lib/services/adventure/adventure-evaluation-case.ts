import {
  aggregateScores,
  evaluateAdventureRun,
  type AdventureSession,
  type RubricScores,
} from "@codex/adventure-engine";
import {
  createCaseExecutionState,
  type AdventureEvaluationCase,
  type AdventureEvaluationCaseResult,
  type AdventureEvaluationResult,
  type CaseExecutionState,
  type EvaluationExecutionDependencies,
} from "./adventure-evaluation-model";
import { evaluationSteps } from "./adventure-evaluation-context";
import { summarizeProgression } from "./adventure-evaluation-progression";
import { runEvaluationStep } from "./adventure-evaluation-step";
import {
  aggregateEvaluationTelemetry,
  buildCaseTelemetry,
  recordRubricTelemetry,
} from "./adventure-evaluation-telemetry";

function countExpansions(session: AdventureSession): number {
  return (
    (session.places?.length ?? 0) +
    (session.scenarioCollection?.items.length ?? 0) +
    (session.worldTime?.events.length ?? 0)
  );
}

export async function runEvaluationCase(
  testCase: AdventureEvaluationCase,
  provider: string,
  dependencies: EvaluationExecutionDependencies,
): Promise<AdventureEvaluationCaseResult> {
  const { now } = dependencies;
  const startedAt = now();
  const initialExpansions = countExpansions(testCase.session);
  const state = createCaseExecutionState(testCase.session);
  const steps = evaluationSteps(testCase);
  for (const [index, step] of steps.entries()) {
    await runEvaluationStep(
      testCase,
      provider,
      step,
      index,
      state,
      dependencies,
    );
    if (state.executionFailures.length > 0) break;
  }

  return buildCaseResult(testCase, state, initialExpansions, startedAt, now);
}

function buildCaseResult(
  testCase: AdventureEvaluationCase,
  state: CaseExecutionState,
  initialExpansions: number,
  startedAt: number,
  now: () => number,
): AdventureEvaluationCaseResult {
  const runScore = evaluateAdventureRun(
    state.evaluatedTurns,
    testCase.canaries,
  );
  recordRubricTelemetry(state, runScore);
  const progression = summarizeProgression(state);
  const scores = {
    ...runScore.scores,
    ...(state.executionFailures.some((failure) => failure.kind === "generation")
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
    telemetry: buildCaseTelemetry(state, startedAt, expansionCount, now),
  };
}

export function aggregateCaseResults(
  provider: string,
  results: AdventureEvaluationCaseResult[],
): AdventureEvaluationResult {
  const telemetry = aggregateEvaluationTelemetry(
    results.map((result) => result.telemetry),
  );

  const average = (rubric: keyof RubricScores) =>
    aggregateScores(results.map((result) => result[rubric]));

  return {
    provider,
    cases: results,
    agency: average("agency"),
    secrecy: average("secrecy"),
    continuity: average("continuity"),
    canonSafety: average("canonSafety"),
    consequenceCredibility: average("consequenceCredibility"),
    unnecessaryEscalation: average("unnecessaryEscalation"),
    passed: results.length > 0 && results.every((r) => r.passed),
    telemetry,
  };
}
