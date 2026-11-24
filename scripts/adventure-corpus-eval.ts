#!/usr/bin/env bun
/** Explicit opt-in paired comparison across the synthetic adventure corpus. */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  ADVENTURE_EVALUATION_CONDITIONS,
  type AdventureEvaluationCondition,
} from "../apps/web/src/lib/services/adventure/adventure-evaluation-runner";
import {
  callTotals,
  createGenerationService,
  parseEvaluationCliArgs,
  type AdventureEvaluationProxyConfig,
  type ProxyCallRecord,
} from "./adventure-director-eval";
import { ADVENTURE_EVALUATION_CORPUS } from "./adventure-evaluation-corpus-fixtures";
import { prepareAdventureEvaluationCorpus } from "./adventure-evaluation-corpus-builder";
import { evaluatePreparedCorpusCase } from "./adventure-evaluation-corpus-runner";
import {
  markdownCorpusReport,
  pairedEvidenceStatus,
  type CorpusCaseReport,
} from "./adventure-evaluation-corpus-report";

export interface CorpusCliOptions extends AdventureEvaluationProxyConfig {
  live: boolean;
  efforts: Array<"low" | "medium">;
  directors: boolean[];
  contexts: Array<"retained" | "reconstructed">;
  samples: number;
  output: string;
}

export function parseCorpusArgs(
  args = process.argv.slice(2),
): CorpusCliOptions {
  const defaultOutput = `/tmp/gm-director-corpus-live-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}`;
  return parseEvaluationCliArgs(args, {
    efforts: "low",
    contexts: "retained",
    output: defaultOutput,
  });
}

export function conditionsForCorpus(
  options: CorpusCliOptions,
): AdventureEvaluationCondition[] {
  return ADVENTURE_EVALUATION_CONDITIONS.filter(
    (condition) =>
      options.efforts.includes(condition.reasoningEffort) &&
      options.directors.includes(condition.directorEnabled) &&
      options.contexts.includes(condition.contextMode),
  );
}

export function buildCorpusLiveReport(
  options: Pick<CorpusCliOptions, "samples">,
  reports: CorpusCaseReport[],
) {
  const evidence = pairedEvidenceStatus(
    reports,
    ADVENTURE_EVALUATION_CORPUS.map((fixture) => ({
      fixtureId: fixture.id,
      pathIds: fixture.paths.map((path) => path.id),
    })),
  );
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    samples: options.samples,
    evidence,
    reports,
  };
}

function logCaseResult(report: CorpusCaseReport): void {
  console.log(
    `${report.fixtureId}/${report.pathId} sample ${report.sample} — ${report.condition.reasoningEffort}, Director ${report.condition.directorEnabled ? "on" : "off"}, ${report.condition.contextMode}: ${report.status}; ${report.metrics.completedRequests}/${report.metrics.modelCalls} calls completed`,
  );
}

async function runLive(
  options: CorpusCliOptions,
  conditions: AdventureEvaluationCondition[],
): Promise<void> {
  const calls: ProxyCallRecord[] = [];
  const generation = createGenerationService(options, calls);
  const cases = corpusRunCases(options.samples, conditions);
  const reports = await evaluateCorpusCases(cases, generation, calls);
  const report = buildCorpusLiveReport(options, reports);
  await writeCorpusReport(options.output, report);
  console.log(
    `Wrote ${options.output}.md and ${options.output}.json; treatment-review eligibility: ${report.evidence.eligibleForTreatmentClaim ? "threshold met" : "descriptive only"}`,
  );
}

function corpusRunCases(
  samples: number,
  conditions: AdventureEvaluationCondition[],
): Array<{
  prepared: ReturnType<typeof prepareAdventureEvaluationCorpus>[number];
  condition: AdventureEvaluationCondition;
}> {
  return Array.from({ length: samples }, (_, index) => index + 1).flatMap(
    (sample) =>
      prepareAdventureEvaluationCorpus(sample).flatMap((prepared) =>
        conditions.map((condition) => ({ prepared, condition })),
      ),
  );
}

async function evaluateCorpusCases(
  cases: ReturnType<typeof corpusRunCases>,
  generation: ReturnType<typeof createGenerationService>,
  calls: ProxyCallRecord[],
): Promise<CorpusCaseReport[]> {
  const reports: CorpusCaseReport[] = [];
  for (const { prepared, condition } of cases) {
    const callStart = calls.length;
    const report = await evaluatePreparedCorpusCase(
      generation,
      prepared,
      condition,
      () => callTotals(calls.slice(callStart)),
    );
    reports.push(report);
    logCaseResult(report);
  }
  return reports;
}

async function writeCorpusReport(
  output: string,
  report: ReturnType<typeof buildCorpusLiveReport>,
): Promise<void> {
  await mkdir(dirname(output), { recursive: true });
  await Promise.all([
    writeFile(`${output}.json`, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(`${output}.md`, markdownCorpusReport(report)),
  ]);
}

async function main(): Promise<void> {
  const options = parseCorpusArgs();
  const conditions = conditionsForCorpus(options);
  if (conditions.length === 0) {
    throw new Error("No evaluation conditions selected.");
  }
  const work =
    ADVENTURE_EVALUATION_CORPUS.reduce(
      (total, fixture) => total + fixture.paths.length,
      0,
    ) *
    options.samples *
    conditions.length;
  if (!options.live) {
    console.log(
      `No provider calls made. Selected ${work} fixture-path/condition run(s). Add --live to opt in.`,
    );
    return;
  }
  await runLive(options, conditions);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "evaluation-failed");
    process.exitCode = 1;
  });
}
