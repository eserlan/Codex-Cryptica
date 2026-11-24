import type { RubricScores } from "@codex/adventure-engine";
import type {
  CorpusCaseReport,
  CorpusTurnReport,
  PairedEvidenceStatus,
} from "./adventure-evaluation-corpus-report";

interface CorpusMarkdownReport {
  generatedAt: string;
  samples: number;
  evidence: PairedEvidenceStatus;
  reports: CorpusCaseReport[];
}

function safeMarkdown(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\\`*_{}\x5b\x5d()#+.!|-]/g, "\\$&");
}

function evidenceStatusLine(evidence: PairedEvidenceStatus): string {
  return evidence.eligibleForTreatmentClaim
    ? "Paired-sample threshold met; results are eligible for treatment review, not a causal claim by themselves."
    : "Descriptive only: fewer than three paired samples per path on at least two fixtures. Do not make a treatment or default claim from this run.";
}

function rubricSummary(scores: RubricScores): string {
  return `A${scores.agency}/S${scores.secrecy}/C${scores.continuity}/CS${scores.canonSafety}/CC${scores.consequenceCredibility}/UE${scores.unnecessaryEscalation}`;
}

function progressionSummary(turn: CorpusTurnReport): string {
  if (!turn.progression) return turn.executionFailure ?? "not reached";
  return summarizeProgress(turn.progression);
}

function summarizeProgress(
  progression: NonNullable<CorpusTurnReport["progression"]>,
): string {
  const kind = progression.progressKind ?? "no classified progress";
  return `${kind}; committed ${commitStatus(progression.committed)}`;
}

function commitStatus(committed: boolean): string {
  return committed ? "yes" : "no";
}

function actionColumn(
  action: NonNullable<CorpusTurnReport["generation"]>["actionResolution"],
): string {
  return action ? `${action.outcome}/${action.validation}` : "unknown/unknown";
}

function traceColumn(turn: CorpusTurnReport): string {
  const gen = turn.generation;
  if (!gen) return "unknown / unknown/unknown";
  const delivery = gen.directorDelivery
    ? gen.directorDelivery.status
    : "unknown";
  return `${delivery} / ${actionColumn(gen.actionResolution)}`;
}

function renderTurn(turn: CorpusTurnReport): string[] {
  const beatText = turn.authoredBeats
    .map((beat) => `${safeMarkdown(beat.label)}: **${beat.status}**`)
    .join("<br>");
  const coverage = turn.authoredBeats.map((beat) => beat.status).join(", ");
  const hardGates = turn.rubrics
    ? rubricSummary(turn.rubrics)
    : "not evaluated";
  const generation = turn.generation
    ? `${turn.generation.contextMode}/${turn.generation.resetClassification}`
    : "not reached";
  return [
    `| ${turn.turn} | ${safeMarkdown(turn.playerAction)} | ${beatText} | ${coverage} | ${hardGates} | ${progressionSummary(turn)} | ${generation} | ${traceColumn(turn)} |`,
    "",
    "**Player-facing output:**",
    "",
    ...turn.playerFacingOutput
      .split("\n")
      .map((line) => `> ${safeMarkdown(line)}`),
    "",
  ];
}

function renderCorpusCase(item: CorpusCaseReport): string[] {
  const cost =
    typeof item.metrics.estimatedPriceUsd === "number"
      ? `$${item.metrics.estimatedPriceUsd.toFixed(6)}`
      : item.metrics.estimatedPriceUsd;
  const header = [
    `## ${item.fixtureTitle} — ${item.pathTitle} — sample ${item.sample}`,
    "",
    `Fixture: \`${safeMarkdown(item.fixtureId)}\` (${safeMarkdown(item.sceneType)})  `,
    `Expected hard failures: ${item.hardFailureLabels.map(safeMarkdown).join("; ")}  `,
    `Condition: ${safeMarkdown(item.condition.modelName)}, ${item.condition.reasoningEffort}, Director ${item.condition.directorEnabled ? "on" : "off"}, ${item.condition.contextMode}  `,
    `Result: ${item.status}; rubrics ${rubricSummary(item.rubrics)}  `,
    `Progression: ${item.progression.meaningfulAdvancement} advances; ${item.progression.substantiveAnswers} answers; ${item.progression.actionableProgression} routes; ${item.progression.usefulNegativeFindings} negative findings; ${item.progression.validQuietOutcomes} quiet outcomes; ${item.progression.npcKnowledgeViolations} NPC knowledge violations  `,
    `Calls: ${item.metrics.completedRequests}/${item.metrics.modelCalls} completed; latency ${item.metrics.latencyMs} ms; tokens ${item.metrics.inputTokens}/${item.metrics.outputTokens}; cost ${cost}`,
    ...(item.traceSummary
      ? [
          `Traces: unknown telemetry ${item.traceSummary.unknownTelemetryTurns}; repeated suggestions ${item.traceSummary.repeatedUnchangedSuggestions}; false interventions ${item.traceSummary.falseInterventions} (missing telemetry is unknown, not a failed action)`,
        ]
      : []),
    "",
    "| Turn | Player action | Authored beat | Coverage | Hard gates | Progression | Context / reset | Director / Action |",
    "| ---: | --- | --- | --- | --- | --- | --- | --- |",
  ];
  return [...header, ...item.turns.flatMap(renderTurn)];
}

export function markdownCorpusReport(report: CorpusMarkdownReport): string {
  const header = [
    "# Synthetic Adventure Evaluation Corpus",
    "",
    `Generated: ${report.generatedAt}`,
    `Samples per fixture path and condition: ${report.samples}`,
    evidenceStatusLine(report.evidence),
    "",
    "Authored-beat coverage uses fixture-written evidence phrases as a transparent signal; it is not a semantic judge. Hard safety gates and progression are reported separately. Output is limited to player-facing narration and redacted when the secrecy gate fails.",
    "",
  ];
  return `${[...header, ...report.reports.flatMap(renderCorpusCase)].join("\n")}\n`;
}
