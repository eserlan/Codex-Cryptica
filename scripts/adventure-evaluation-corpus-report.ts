import {
  scoreAuthoredBeats,
  type AuthoredBeatScore,
  type RubricScores,
} from "@codex/adventure-engine";
import type { AdventureTurnGenerationService } from "../packages/ai-engine/src/adventure-turn-generation.service";
import type {
  AdventureEvaluationCaseResult,
  AdventureEvaluationCondition,
  AdventureEvaluationStep,
} from "../apps/web/src/lib/services/adventure/adventure-evaluation-runner";
import type { PreparedCorpusCase } from "./adventure-evaluation-corpus-fixtures";

const MAX_REPORT_OUTPUT_CHARS = 2_000;
const MIN_PAIRED_SAMPLES = 3 as const;
const REDACTED_FOR_SECRECY = "[redacted: secrecy hard gate failed]";

export interface CapturedPlayerOutput {
  stepIndex: number;
  playerAction: string;
  text: string;
}

export type CapturableGenerationService = Pick<
  AdventureTurnGenerationService,
  "generate"
> &
  Partial<
    Pick<
      AdventureTurnGenerationService,
      "confirmInteraction" | "clearInteraction"
    >
  >;

export interface CorpusCallMetrics {
  modelCalls: number;
  completedRequests: number;
  failureClasses: string[];
  latencyMs: number;
  inputTokens: number | "unavailable";
  outputTokens: number | "unavailable";
  reasoningTokens: number | "unavailable";
  estimatedPriceUsd: number | "unavailable";
}

export interface CorpusTurnReport {
  turn: number;
  playerAction: string;
  playerFacingOutput: string;
  outputRedacted: boolean;
  authoredBeats: AuthoredBeatScore[];
  rubrics?: RubricScores;
  rubricFailures?: string[];
  progression?: {
    progressKind?: string;
    committed: boolean;
    expectedSignals: Record<string, boolean | undefined>;
    npcKnowledgeViolations: number;
  };
  generation?: {
    modelKey: string;
    requestedEffort: string;
    actualEffort: string;
    contextMode: string;
    transport: string;
    threadMode: string;
    resetClassification: string;
    generationAttempts: number;
    directorDelivery?: {
      status: string;
      reason: string;
      deliveredChars: number;
      recoveryReason?: string;
    };
    actionResolution?: {
      outcome: string;
      validation: string;
      evidenceCategory: string;
      droppedCount?: number;
    };
    repeatedSuggestedActions?: boolean;
  };
  executionFailure?: "generation" | "commit";
}

export interface CorpusTraceSummary {
  directorDeliveryCounts: Record<string, number>;
  actionOutcomeCounts: Record<string, number>;
  actionValidationCounts: Record<string, number>;
  unknownTelemetryTurns: number;
  repeatedUnchangedSuggestions: number;
  falseInterventions: number;
}

export interface CorpusCaseReport {
  fixtureId: string;
  fixtureTitle: string;
  sceneType: string;
  pathId: string;
  pathTitle: string;
  sample: number;
  hardFailureLabels: string[];
  condition: AdventureEvaluationCondition;
  status: "pass" | "fail" | "blocked";
  passed: boolean;
  rubrics: RubricScores;
  progression: AdventureEvaluationCaseResult["progression"];
  traceSummary?: CorpusTraceSummary;
  metrics: CorpusCallMetrics;
  turns: CorpusTurnReport[];
}

export interface CorpusPathCoverage {
  fixtureId: string;
  pathIds: string[];
}

export interface PairedEvidenceComparison {
  modelName: string;
  reasoningEffort: AdventureEvaluationCondition["reasoningEffort"];
  contextMode: AdventureEvaluationCondition["contextMode"];
  fixtureCount: number;
  minPairedSamplesPerPath: number;
  eligibleForTreatmentClaim: boolean;
}

export interface PairedEvidenceStatus {
  eligibleForTreatmentClaim: boolean;
  minimumPairedSamplesPerPath: 3;
  comparisons: PairedEvidenceComparison[];
}

function boundedText(value: string): string {
  return value.length > MAX_REPORT_OUTPUT_CHARS
    ? `${value.slice(0, MAX_REPORT_OUTPUT_CHARS)}… [truncated]`
    : value;
}

function stepIndexForAction(
  steps: AdventureEvaluationStep[],
  cursor: number,
  action: string,
): number {
  for (let index = cursor; index < steps.length; index += 1) {
    if (steps[index]?.playerAction === action) return index;
  }
  return -1;
}

/** Wraps generation to retain only returned player-facing narration in memory. */
export function capturePlayerFacingOutputs(
  generation: CapturableGenerationService,
  steps: AdventureEvaluationStep[],
  output: CapturedPlayerOutput[],
): CapturableGenerationService {
  let cursor = 0;
  return {
    async generate(request, options) {
      const proposal = await generation.generate(request, options);
      const playerAction = request.playerAction ?? "";
      const stepIndex = stepIndexForAction(steps, cursor, playerAction);
      cursor = nextStepCursor(cursor, stepIndex);
      output.push(capturedOutput(proposal, stepIndex, playerAction));
      return proposal;
    },
    ...(generation.confirmInteraction
      ? {
          confirmInteraction: (sessionId: string, revision?: number) =>
            generation.confirmInteraction?.(sessionId, revision),
        }
      : {}),
    ...(generation.clearInteraction
      ? {
          clearInteraction: (sessionId: string) =>
            generation.clearInteraction?.(sessionId),
        }
      : {}),
  };
}

function nextStepCursor(cursor: number, stepIndex: number): number {
  return stepIndex >= 0 ? stepIndex + 1 : cursor;
}

function capturedOutput(
  proposal: Awaited<ReturnType<AdventureTurnGenerationService["generate"]>>,
  stepIndex: number,
  playerAction: string,
): CapturedPlayerOutput {
  const text =
    proposal.kind === "complete"
      ? proposal.narration
      : (proposal.setupNarration ?? "");
  return { stepIndex, playerAction, text: boundedText(text) };
}

function outputForStep(
  output: CapturedPlayerOutput[],
  stepIndex: number,
): string | undefined {
  return output.find((item) => item.stepIndex === stepIndex)?.text;
}

function failureForTurn(
  result: AdventureEvaluationCaseResult,
  turn: number,
): "generation" | "commit" | undefined {
  return result.executionFailures.find((failure) => failure.turn === turn)
    ?.kind;
}

function visibleOutput(
  rawOutput: string | undefined,
  outputRedacted: boolean,
): string {
  if (outputRedacted) return REDACTED_FOR_SECRECY;
  return rawOutput ?? "[no player-facing output generated]";
}

function redactBeatScores(scores: AuthoredBeatScore[]): AuthoredBeatScore[] {
  return scores.map((_, index) => ({
    id: `redacted-beat-${index + 1}`,
    label: REDACTED_FOR_SECRECY,
    status: "absent" as const,
    matchedRequiredEvidence: [],
    matchedPartialEvidence: [],
  }));
}

function telemetryFields(
  telemetry:
    AdventureEvaluationCaseResult["telemetry"]["turns"][number] | undefined,
): Pick<
  CorpusTurnReport,
  "rubrics" | "rubricFailures" | "progression" | "generation"
> {
  if (!telemetry) return {};
  return {
    ...rubricFields(telemetry),
    progression: progressionFields(telemetry),
    generation: generationFields(telemetry),
  };
}

function rubricFields(
  telemetry: AdventureEvaluationCaseResult["telemetry"]["turns"][number],
): Pick<CorpusTurnReport, "rubrics" | "rubricFailures"> {
  return {
    ...(telemetry.rubrics ? { rubrics: telemetry.rubrics } : {}),
    ...(telemetry.rubricFailures
      ? { rubricFailures: telemetry.rubricFailures }
      : {}),
  };
}

function progressionFields(
  telemetry: AdventureEvaluationCaseResult["telemetry"]["turns"][number],
): NonNullable<CorpusTurnReport["progression"]> {
  return {
    ...(telemetry.progressKind ? { progressKind: telemetry.progressKind } : {}),
    committed: telemetry.committed,
    expectedSignals: telemetry.expectedSignals,
    npcKnowledgeViolations: telemetry.npcKnowledgeViolations,
  };
}

function deliveryFieldsForTurn(
  delivery: AdventureEvaluationCaseResult["telemetry"]["turns"][number]["directorDelivery"],
): Partial<NonNullable<CorpusTurnReport["generation"]>> {
  if (!delivery) return {};
  return {
    directorDelivery: {
      status: delivery.status,
      reason: delivery.reason,
      deliveredChars: delivery.deliveredChars,
      ...(delivery.recoveryReason
        ? { recoveryReason: delivery.recoveryReason }
        : {}),
    },
  };
}

function actionFieldsForTurn(
  action: AdventureEvaluationCaseResult["telemetry"]["turns"][number]["actionResolution"],
): Partial<NonNullable<CorpusTurnReport["generation"]>> {
  if (!action) return {};
  return {
    actionResolution: {
      outcome: action.outcome,
      validation: action.validation,
      evidenceCategory: action.evidenceCategory,
      ...(action.droppedCount !== undefined
        ? { droppedCount: action.droppedCount }
        : {}),
    },
  };
}

function traceFieldsForTurn(
  telemetry: AdventureEvaluationCaseResult["telemetry"]["turns"][number],
): Partial<NonNullable<CorpusTurnReport["generation"]>> {
  return {
    ...deliveryFieldsForTurn(telemetry.directorDelivery),
    ...actionFieldsForTurn(telemetry.actionResolution),
    ...(telemetry.repeatedSuggestedActions
      ? { repeatedSuggestedActions: true }
      : {}),
  };
}

function generationFields(
  telemetry: AdventureEvaluationCaseResult["telemetry"]["turns"][number],
): NonNullable<CorpusTurnReport["generation"]> {
  return {
    modelKey: telemetry.modelKey,
    requestedEffort: telemetry.requestedEffort,
    actualEffort: telemetry.actualEffort,
    contextMode: telemetry.contextMode,
    transport: telemetry.transport,
    threadMode: telemetry.threadMode,
    resetClassification: telemetry.resetClassification,
    generationAttempts: telemetry.generationAttempts,
    ...traceFieldsForTurn(telemetry),
  };
}

function executionFailureFields(
  result: AdventureEvaluationCaseResult,
  turn: number,
): Pick<CorpusTurnReport, "executionFailure"> {
  const executionFailure = failureForTurn(result, turn);
  return executionFailure ? { executionFailure } : {};
}

function buildCorpusTurnReport(
  prepared: PreparedCorpusCase,
  result: AdventureEvaluationCaseResult,
  capturedOutputs: CapturedPlayerOutput[],
  step: PreparedCorpusCase["steps"][number],
  index: number,
): CorpusTurnReport {
  const turn = index + 1;
  const telemetry = result.telemetry.turns.find((item) => item.turn === turn);
  const rawOutput = outputForStep(capturedOutputs, index);
  const outputRedacted = telemetry?.rubrics?.secrecy === 0;
  const beatScores = scoreAuthoredBeats(
    outputRedacted ? undefined : rawOutput,
    step.expectedBeats,
  );
  return {
    turn,
    playerAction: step.playerAction,
    playerFacingOutput: visibleOutput(rawOutput, outputRedacted),
    outputRedacted,
    authoredBeats: outputRedacted ? redactBeatScores(beatScores) : beatScores,
    ...telemetryFields(telemetry),
    ...executionFailureFields(result, turn),
  };
}

function evaluationStatus(
  passed: boolean,
  metrics: CorpusCallMetrics,
): CorpusCaseReport["status"] {
  if (passed) return "pass";
  return metrics.modelCalls > 0 && metrics.completedRequests === 0
    ? "blocked"
    : "fail";
}

function incrementCount(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

const DELIVERED_DIRECTOR_STATUSES = new Set([
  "included",
  "truncated",
  "retained",
]);
const IGNORED_RECOVERY_REASONS = new Set<string | undefined>([
  undefined,
  "",
  "none",
]);

export function isFalseIntervention(
  delivery: NonNullable<CorpusTurnReport["generation"]>["directorDelivery"],
  outcome: string,
): boolean {
  if (!delivery || outcome !== "unresolved") return false;
  return (
    !IGNORED_RECOVERY_REASONS.has(delivery.recoveryReason) &&
    DELIVERED_DIRECTOR_STATUSES.has(delivery.status)
  );
}

function recordUnknownTurnTrace(summary: CorpusTraceSummary): void {
  incrementCount(summary.directorDeliveryCounts, "unknown");
  incrementCount(summary.actionOutcomeCounts, "unknown");
  incrementCount(summary.actionValidationCounts, "unknown");
  summary.unknownTelemetryTurns += 1;
}

function isMissingTrace(
  gen: NonNullable<CorpusTurnReport["generation"]>,
): boolean {
  return !gen.directorDelivery || !gen.actionResolution;
}

function recordGenerationTraceFlags(
  summary: CorpusTraceSummary,
  gen: NonNullable<CorpusTurnReport["generation"]>,
  outcome: string,
): void {
  if (isMissingTrace(gen)) summary.unknownTelemetryTurns += 1;
  if (gen.repeatedSuggestedActions) summary.repeatedUnchangedSuggestions += 1;
  if (isFalseIntervention(gen.directorDelivery, outcome)) {
    summary.falseInterventions += 1;
  }
}

function traceLabels(gen: NonNullable<CorpusTurnReport["generation"]>) {
  return {
    deliveryStatus: gen.directorDelivery
      ? gen.directorDelivery.status
      : "unknown",
    outcome: gen.actionResolution ? gen.actionResolution.outcome : "unknown",
    validation: gen.actionResolution
      ? gen.actionResolution.validation
      : "unknown",
  };
}

function recordTurnTrace(
  summary: CorpusTraceSummary,
  turn: CorpusTurnReport,
): void {
  const gen = turn.generation;
  if (!gen) {
    recordUnknownTurnTrace(summary);
    return;
  }
  const { deliveryStatus, outcome, validation } = traceLabels(gen);
  incrementCount(summary.directorDeliveryCounts, deliveryStatus);
  incrementCount(summary.actionOutcomeCounts, outcome);
  incrementCount(summary.actionValidationCounts, validation);
  recordGenerationTraceFlags(summary, gen, outcome);
}

function summarizeCaseTraces(
  turns: CorpusTurnReport[],
  telemetryTurns: number[],
): CorpusTraceSummary {
  const summary: CorpusTraceSummary = {
    directorDeliveryCounts: {},
    actionOutcomeCounts: {},
    actionValidationCounts: {},
    unknownTelemetryTurns: 0,
    repeatedUnchangedSuggestions: 0,
    falseInterventions: 0,
  };
  const reachedTurns = new Set(telemetryTurns);
  for (const turn of turns) {
    if (reachedTurns.has(turn.turn)) recordTurnTrace(summary, turn);
  }
  return summary;
}

export function buildCorpusCaseReport(
  prepared: PreparedCorpusCase,
  condition: AdventureEvaluationCondition,
  result: AdventureEvaluationCaseResult,
  capturedOutputs: CapturedPlayerOutput[],
  metrics: CorpusCallMetrics,
): CorpusCaseReport {
  const turns = prepared.steps.map((step, index) =>
    buildCorpusTurnReport(prepared, result, capturedOutputs, step, index),
  );
  return {
    fixtureId: prepared.fixtureId,
    fixtureTitle: prepared.fixtureTitle,
    sceneType: prepared.sceneType,
    pathId: prepared.pathId,
    pathTitle: prepared.pathTitle,
    sample: prepared.sample,
    hardFailureLabels: [...prepared.hardFailureLabels],
    condition,
    status: evaluationStatus(result.passed, metrics),
    passed: result.passed,
    rubrics: {
      agency: result.agency,
      secrecy: result.secrecy,
      continuity: result.continuity,
      canonSafety: result.canonSafety,
      consequenceCredibility: result.consequenceCredibility,
      unnecessaryEscalation: result.unnecessaryEscalation,
    },
    progression: result.progression,
    traceSummary: summarizeCaseTraces(
      turns,
      result.telemetry.turns.map((turn) => turn.turn),
    ),
    metrics,
    turns,
  };
}

type ComparisonKey = string;

function conditionKey(condition: AdventureEvaluationCondition): ComparisonKey {
  return `${condition.modelName}|${condition.reasoningEffort}|${condition.contextMode}`;
}

function groupReportsByCondition(
  reports: CorpusCaseReport[],
): Map<ComparisonKey, CorpusCaseReport[]> {
  const groups = new Map<ComparisonKey, CorpusCaseReport[]>();
  for (const report of reports) {
    const key = conditionKey(report.condition);
    groups.set(key, [...(groups.get(key) ?? []), report]);
  }
  return groups;
}

function pairedSampleCount(
  reports: CorpusCaseReport[],
  fixtureId: string,
  pathId: string,
): number {
  const matching = reports.filter(
    (report) => report.fixtureId === fixtureId && report.pathId === pathId,
  );
  const samples = new Set(matching.map((report) => report.sample));
  return [...samples].filter((sample) => hasPairedTreatments(matching, sample))
    .length;
}

function hasPairedTreatments(
  reports: CorpusCaseReport[],
  sample: number,
): boolean {
  const sampleReports = reports.filter((report) => report.sample === sample);
  return (
    sampleReports.some((report) => !report.condition.directorEnabled) &&
    sampleReports.some((report) => report.condition.directorEnabled)
  );
}

function fixturePairCoverage(
  reports: CorpusCaseReport[],
  fixture: CorpusPathCoverage,
): { meetsThreshold: boolean; minimumSamples: number } {
  const pathCounts = fixture.pathIds.map((pathId) =>
    pairedSampleCount(reports, fixture.fixtureId, pathId),
  );
  const minimumSamples = pathCounts.length > 0 ? Math.min(...pathCounts) : 0;
  return {
    meetsThreshold:
      pathCounts.length > 0 &&
      pathCounts.every((count) => count >= MIN_PAIRED_SAMPLES),
    minimumSamples,
  };
}

function conditionComparison(
  key: ComparisonKey,
  reports: CorpusCaseReport[],
  paths: CorpusPathCoverage[],
): PairedEvidenceComparison {
  const [modelName, effort, context] = key.split("|");
  const fixtureCoverage = paths.map((fixture) =>
    fixturePairCoverage(reports, fixture),
  );
  const fixtureCount = qualifyingFixtureCount(fixtureCoverage);
  const minPairedSamplesPerPath = minimumPairedSamples(fixtureCoverage);
  return {
    modelName: modelName ?? "unknown",
    reasoningEffort: effort === "medium" ? "medium" : "low",
    contextMode: context === "reconstructed" ? "reconstructed" : "retained",
    fixtureCount,
    minPairedSamplesPerPath,
    eligibleForTreatmentClaim: qualifiesForTreatmentClaim(
      reports,
      fixtureCount,
      minPairedSamplesPerPath,
    ),
  };
}

function qualifyingFixtureCount(
  coverage: Array<{ meetsThreshold: boolean }>,
): number {
  return coverage.filter((item) => item.meetsThreshold).length;
}

function minimumPairedSamples(
  coverage: Array<{ minimumSamples: number }>,
): number {
  return coverage.reduce(
    (minimum, item) => Math.min(minimum, item.minimumSamples),
    coverage.length === 0 ? 0 : Number.POSITIVE_INFINITY,
  );
}

function qualifiesForTreatmentClaim(
  reports: CorpusCaseReport[],
  fixtureCount: number,
  minimumSamples: number,
): boolean {
  const hasOffTreatment = reports.some(
    (report) => !report.condition.directorEnabled,
  );
  const hasOnTreatment = reports.some(
    (report) => report.condition.directorEnabled,
  );
  return (
    hasOffTreatment &&
    hasOnTreatment &&
    fixtureCount >= 2 &&
    minimumSamples >= MIN_PAIRED_SAMPLES
  );
}

export function pairedEvidenceStatus(
  reports: CorpusCaseReport[],
  paths: CorpusPathCoverage[],
): PairedEvidenceStatus {
  const comparisons = [...groupReportsByCondition(reports)].map(
    ([key, group]) => conditionComparison(key, group, paths),
  );
  return {
    eligibleForTreatmentClaim:
      comparisons.length > 0 &&
      comparisons.every((comparison) => comparison.eligibleForTreatmentClaim),
    minimumPairedSamplesPerPath: 3,
    comparisons,
  };
}

export { markdownCorpusReport } from "./adventure-evaluation-corpus-markdown";
