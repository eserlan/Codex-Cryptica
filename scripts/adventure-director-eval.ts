#!/usr/bin/env bun
/** Explicit opt-in live comparison for the synthetic GM Director fixture. */

import { parseArgs } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getModel } from "../apps/workers/oracle-proxy/src/llm/registry";
import { AdventureEvaluationRunner } from "../apps/web/src/lib/services/adventure/adventure-evaluation-runner";
import {
  AdventureTurnGenerationService,
  type AdventureAIClient,
} from "../packages/ai-engine/src/adventure-turn-generation.service";
import { createProxyModel } from "../packages/ai-engine/src/proxy-model";
import { ProxyInteractions } from "../packages/ai-engine/src/proxy-interactions";
import {
  ADVENTURE_EVALUATION_CONDITIONS,
  type AdventureEvaluationCase,
  type AdventureEvaluationCaseResult,
  type AdventureEvaluationCondition,
} from "../apps/web/src/lib/services/adventure/adventure-evaluation-runner";
import {
  createGmDirectorEvaluationSession,
  GM_DIRECTOR_EVALUATION_STEPS,
} from "../packages/adventure-engine/tests/fixtures/gm-director-evaluation";

type Usage = {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
};
type ModelPricing = NonNullable<ReturnType<typeof getModel>>["pricing"];

interface ProxyCallRecord {
  actualModelKey?: string;
  elapsedMs: number;
  usage?: Usage;
  completed: boolean;
  failureClass?: string;
}

interface CliOptions {
  live: boolean;
  efforts: Array<"low" | "medium">;
  directors: boolean[];
  contexts: Array<"retained" | "reconstructed">;
  samples: number;
  proxy: string;
  origin: string;
  output: string;
}

function parseChoices<T extends string>(
  raw: string,
  allowed: readonly T[],
  label: string,
): T[] {
  const values = raw.split(",").map((item) => item.trim());
  if (values.some((value) => !allowed.includes(value as T))) {
    throw new Error(`${label} must be one or more of: ${allowed.join(", ")}.`);
  }
  return [...new Set(values as T[])];
}

function parseDirectors(raw: string): boolean[] {
  const values = parseChoices(raw, ["on", "off"] as const, "Directors");
  return values.map((value) => value === "on");
}

function parseSampleCount(raw: string): number {
  const samples = Number(raw);
  if (!Number.isInteger(samples) || samples < 1 || samples > 3) {
    throw new Error("Samples must be an integer from 1 to 3.");
  }
  return samples;
}

function parseLocalProxy(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Proxy URL must be a valid local URL.");
  }
  if (!isSafeLocalProxy(url)) {
    throw new Error("Proxy URL must target a local loopback host.");
  }
  return raw;
}

function isSafeLocalProxy(url: URL): boolean {
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    isLoopbackHostname(hostname) &&
    isHttpProtocol(url) &&
    hasNoCredentials(url) &&
    hasNoQueryOrFragment(url)
  );
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  );
}

function isHttpProtocol(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

function hasNoCredentials(url: URL): boolean {
  return !url.username && !url.password;
}

function hasNoQueryOrFragment(url: URL): boolean {
  return !url.search && !url.hash;
}

function parseCli(): CliOptions {
  const { values } = parseArgs({
    options: {
      live: { type: "boolean", default: false },
      efforts: { type: "string", default: "low,medium" },
      directors: { type: "string", default: "off,on" },
      contexts: { type: "string", default: "retained,reconstructed" },
      samples: { type: "string", default: "1" },
      proxy: {
        type: "string",
        default: process.env.ORACLE_PROXY_URL ?? "http://127.0.0.1:8787",
      },
      origin: {
        type: "string",
        default: process.env.ORACLE_PROXY_ORIGIN ?? "http://localhost:5173",
      },
      output: {
        type: "string",
        default: "docs/experiments/gm-director-matrix-live-2026-11-24",
      },
    },
    strict: true,
  });
  return {
    live: values.live!,
    efforts: parseChoices(
      values.efforts!,
      ["low", "medium"] as const,
      "Efforts",
    ),
    directors: parseDirectors(values.directors!),
    contexts: parseChoices(
      values.contexts!,
      ["retained", "reconstructed"] as const,
      "Contexts",
    ),
    samples: parseSampleCount(values.samples!),
    proxy: parseLocalProxy(values.proxy!),
    origin: values.origin!,
    output: resolve(values.output!),
  };
}

function conditionsFor(cli: CliOptions): AdventureEvaluationCondition[] {
  return ADVENTURE_EVALUATION_CONDITIONS.filter(
    (condition) =>
      cli.efforts.includes(condition.reasoningEffort) &&
      cli.directors.includes(condition.directorEnabled) &&
      cli.contexts.includes(condition.contextMode),
  );
}

function makeCase(sample: number): AdventureEvaluationCase {
  return {
    id: `northbrook-bell-sample-${sample}`,
    session: {
      ...createGmDirectorEvaluationSession(),
      id: `northbrook-bell-sample-session-${sample}`,
    },
    playerAction: GM_DIRECTOR_EVALUATION_STEPS[0]!.playerAction,
    playerCharacterName: "Mara",
    canaries: [],
    turns: structuredClone(GM_DIRECTOR_EVALUATION_STEPS),
  };
}

function createGenerationService(
  cli: CliOptions,
  calls: ProxyCallRecord[],
): AdventureTurnGenerationService {
  const authenticatedFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Origin", cli.origin);
    const sessionToken = process.env.ORACLE_SESSION_TOKEN;
    if (sessionToken) headers.set("Authorization", `Bearer ${sessionToken}`);
    return fetch(input, { ...init, headers });
  };
  const interactions = new ProxyInteractions(cli.proxy, authenticatedFetch);
  const client: AdventureAIClient = {
    async getModel(_apiKey, modelName, systemInstruction) {
      return createProxyModel(modelName, systemInstruction, {
        getProxyUrl: () => cli.proxy,
        doFetch: authenticatedFetch,
      });
    },
    async sendInteraction(params) {
      return runProxyInteraction(interactions, params, calls);
    },
  };
  return new AdventureTurnGenerationService(client);
}

async function runProxyInteraction(
  interactions: ProxyInteractions,
  params: Parameters<ProxyInteractions["send"]>[0],
  calls: ProxyCallRecord[],
) {
  const started = performance.now();
  try {
    const result = await interactions.send(params);
    calls.push({
      actualModelKey: result.modelKey,
      elapsedMs: Math.round(performance.now() - started),
      usage: result.usage,
      completed: true,
    });
    return result;
  } catch (error) {
    calls.push({
      elapsedMs: Math.round(performance.now() - started),
      completed: false,
      failureClass: proxyFailureClass(error),
    });
    throw error;
  }
}

function proxyFailureClass(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const categories: Array<[RegExp, string]> = [
    [/\b403\b|forbidden/, "forbidden"],
    [/\b401\b|unauthorized/, "unauthorized"],
    [/\b429\b|rate.?limit/, "rate-limited"],
    [/\b5\d\d\b|unavailable|failed to reach/, "provider-unavailable"],
  ];
  return (
    categories.find(([pattern]) => pattern.test(message))?.[1] ??
    "generation-request-failed"
  );
}

function readUsageTotal(
  calls: ProxyCallRecord[],
  field: keyof Usage,
): number | undefined {
  if (calls.length === 0 || calls.some((call) => !call.completed)) {
    return undefined;
  }
  if (calls.some((call) => typeof call.usage?.[field] !== "number")) {
    return undefined;
  }
  return calls.reduce((sum, call) => sum + (call.usage?.[field] ?? 0), 0);
}

function priceForCall(call: ProxyCallRecord): number {
  return usagePrice(call.usage, modelPricing(call.actualModelKey));
}

function modelPricing(modelKey: string | undefined) {
  if (!modelKey) return undefined;
  return getModel(modelKey)?.pricing;
}

function usagePrice(
  usage: Usage | undefined,
  pricing: ModelPricing | undefined,
): number {
  if (!pricing) return Number.NaN;
  const inputTokens = usageToken(usage, "inputTokens");
  const outputTokens = usageToken(usage, "outputTokens");
  if (inputTokens === undefined || outputTokens === undefined) {
    return Number.NaN;
  }
  return (
    (inputTokens / 1000) * pricing.inputPer1kTokens +
    (outputTokens / 1000) * pricing.outputPer1kTokens
  );
}

function usageToken(
  usage: Usage | undefined,
  key: keyof Usage,
): number | undefined {
  return usage?.[key];
}

function estimatedPrice(
  calls: ProxyCallRecord[],
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): number | undefined {
  if (inputTokens === undefined || outputTokens === undefined) return undefined;
  if (calls.some((call) => !call.actualModelKey)) return undefined;
  return calls.reduce((sum, call) => sum + priceForCall(call), 0);
}

function callTotals(calls: ProxyCallRecord[]) {
  const inputTokens = readUsageTotal(calls, "inputTokens");
  const outputTokens = readUsageTotal(calls, "outputTokens");
  const reasoningTokens = readUsageTotal(calls, "reasoningTokens");
  const price = estimatedPrice(calls, inputTokens, outputTokens);
  return {
    modelCalls: calls.length,
    completedRequests: calls.filter((call) => call.completed).length,
    failureClasses: calls
      .map((call) => call.failureClass)
      .filter((value): value is string => Boolean(value)),
    latencyMs: calls.reduce((sum, call) => sum + call.elapsedMs, 0),
    actualModelKeys: [
      ...new Set(
        calls
          .filter((call) => call.completed)
          .map((call) => call.actualModelKey)
          .filter((key): key is string => Boolean(key)),
      ),
    ],
    inputTokens: inputTokens ?? "unavailable",
    outputTokens: outputTokens ?? "unavailable",
    reasoningTokens: reasoningTokens ?? "unavailable",
    estimatedPriceUsd: roundedPrice(price),
  };
}

function roundedPrice(price: number | undefined): number | "unavailable" {
  return price !== undefined && Number.isFinite(price)
    ? Number(price.toFixed(6))
    : "unavailable";
}

function markdownReport(report: {
  generatedAt: string;
  proxy: string;
  origin: string;
  fixtureActions: number;
  samples: number;
  results: Array<{
    condition: AdventureEvaluationCondition;
    sample: number;
    status: "pass" | "fail" | "blocked";
    rubrics: Record<string, number>;
    progression: Record<string, number>;
    usage: ReturnType<typeof callTotals>;
  }>;
}): string {
  const rows = report.results.map((item) => {
    const { condition, sample, rubrics, progression, usage } = item;
    return `| ${condition.reasoningEffort} | ${condition.directorEnabled ? "on" : "off"} | ${condition.contextMode} | ${sample} | ${item.status} | ${rubrics.agency}/${rubrics.secrecy}/${rubrics.continuity}/${rubrics.canonSafety}/${rubrics.consequenceCredibility}/${rubrics.unnecessaryEscalation} | ${progression.substantiveAnswers} answers; ${progression.actionableProgression} routes; ${progression.usefulNegativeFindings} negative findings; ${progression.causalConsistencyFailures} causal conflicts; ${progression.npcKnowledgeViolations} knowledge leaks; ${progression.validQuietOutcomes} quiet outcomes | ${usage.completedRequests}/${usage.modelCalls} completed/attempted; ${usage.latencyMs} ms | ${usage.inputTokens} / ${usage.outputTokens} tokens | ${typeof usage.estimatedPriceUsd === "number" ? `$${usage.estimatedPriceUsd.toFixed(6)}` : usage.estimatedPriceUsd} |`;
  });
  return [
    "# Synthetic GM Director Live Comparison",
    "",
    `Generated: ${report.generatedAt}`,
    `Proxy: ${report.proxy}`,
    `Origin: ${report.origin}`,
    `Fixture actions per sample: ${report.fixtureActions}`,
    `Samples per condition: ${report.samples}`,
    "",
    "This report contains aggregate scores and bounded generation metadata only. It does not include prompts, narration, provider interaction IDs, API keys, or user data. One sample per condition is descriptive and does not establish a causal effect.",
    "",
    "| Effort | Director | Context | Sample | Result | A/S/C/CS/CC/UE | Progression / integrity signals | Completed / attempted; latency | Input / output tokens | Estimated price |",
    "| --- | --- | --- | ---: | --- | --- | --- | ---: | --- | ---: |",
    ...rows,
    "",
    "## Per-turn transport and progression metadata",
    "",
    "See the adjacent JSON file for each turn's registry model key, requested and reported effort, transport, thread mode, reset classification, commit result, progress category, rubric scores, and bounded canon/consequence failure reasons. Missing provider usage or pricing is reported as `unavailable`.",
    "",
    "Before changing a global model or reasoning default, collect at least three paired replays per condition across two synthetic fixtures, show consistent predeclared progression improvement, preserve all secrecy/canon/agency stop-ship gates, and document latency and cost trade-offs.",
    "",
  ].join("\n");
}

function caseResultStatus(
  passed: boolean,
  modelCalls: number,
  calls: ProxyCallRecord[],
): "pass" | "fail" | "blocked" {
  if (passed) return "pass";
  return modelCalls > 0 && allCallsFailed(calls) ? "blocked" : "fail";
}

function allCallsFailed(calls: ProxyCallRecord[]): boolean {
  return calls.length > 0 && calls.every((call) => !call.completed);
}

function makeConditionResult(
  condition: AdventureEvaluationCondition,
  sample: number,
  caseResult: AdventureEvaluationCaseResult,
  calls: ProxyCallRecord[],
) {
  return {
    condition,
    sample,
    status: caseResultStatus(
      caseResult.passed,
      caseResult.telemetry.modelCalls,
      calls,
    ),
    rubrics: {
      agency: caseResult.agency,
      secrecy: caseResult.secrecy,
      continuity: caseResult.continuity,
      canonSafety: caseResult.canonSafety,
      consequenceCredibility: caseResult.consequenceCredibility,
      unnecessaryEscalation: caseResult.unnecessaryEscalation,
    },
    progression: caseResult.progression,
    executionFailures: caseResult.executionFailures,
    turns: caseResult.telemetry.turns,
    usage: callTotals(calls),
  };
}

function logConditionResult(
  condition: AdventureEvaluationCondition,
  sample: number,
  result: ReturnType<typeof makeConditionResult>,
  calls: ProxyCallRecord[],
): void {
  const completed = calls.filter((call) => call.completed).length;
  console.log(
    `${condition.reasoningEffort} / Director ${condition.directorEnabled ? "on" : "off"} / ${condition.contextMode} / sample ${sample}: ${result.status}, ${completed}/${calls.length} completed/attempted calls`,
  );
}

async function runConditionSample(
  generation: AdventureTurnGenerationService,
  calls: ProxyCallRecord[],
  condition: AdventureEvaluationCondition,
  sample: number,
) {
  const callStart = calls.length;
  const runner = new AdventureEvaluationRunner(
    generation,
    [condition.modelName],
    {
      directorEnabled: condition.directorEnabled,
      reasoningEffort: condition.reasoningEffort,
      contextMode: condition.contextMode,
    },
  );
  const [conditionResult] = await runner.runConditionMatrix(
    [makeCase(sample)],
    [condition],
  );
  const caseResult = conditionResult?.results[0]?.cases[0];
  if (!caseResult)
    throw new Error("Evaluation condition returned no case result.");
  const conditionCalls = calls.slice(callStart);
  const result = makeConditionResult(
    condition,
    sample,
    caseResult,
    conditionCalls,
  );
  logConditionResult(condition, sample, result, conditionCalls);
  return result;
}

async function runConditionSamples(
  cli: CliOptions,
  generation: AdventureTurnGenerationService,
  calls: ProxyCallRecord[],
  condition: AdventureEvaluationCondition,
) {
  const results = [];
  for (let sample = 1; sample <= cli.samples; sample += 1) {
    results.push(
      await runConditionSample(generation, calls, condition, sample),
    );
  }
  return results;
}

async function runSelectedConditions(
  cli: CliOptions,
  conditions: AdventureEvaluationCondition[],
  generation: AdventureTurnGenerationService,
  calls: ProxyCallRecord[],
) {
  const results = [];
  for (const condition of conditions) {
    results.push(
      ...(await runConditionSamples(cli, generation, calls, condition)),
    );
  }
  return results;
}

function makeLiveReport(
  cli: CliOptions,
  conditions: AdventureEvaluationCondition[],
  results: Awaited<ReturnType<typeof runSelectedConditions>>,
) {
  const generatedAt = new Date().toISOString();
  return {
    schemaVersion: 1,
    generatedAt,
    fixture: "synthetic-northbrook-bell",
    fixtureActions: GM_DIRECTOR_EVALUATION_STEPS.length,
    samples: cli.samples,
    proxy: cli.proxy,
    origin: cli.origin,
    model: "luna-fast",
    conditions,
    results,
  };
}

async function writeLiveReport(
  cli: CliOptions,
  report: ReturnType<typeof makeLiveReport>,
) {
  await mkdir(resolve(cli.output, ".."), { recursive: true });
  await Promise.all([
    writeFile(`${cli.output}.json`, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(
      `${cli.output}.md`,
      markdownReport({
        generatedAt: report.generatedAt,
        proxy: cli.proxy,
        origin: cli.origin,
        fixtureActions: GM_DIRECTOR_EVALUATION_STEPS.length,
        samples: cli.samples,
        results: report.results,
      }),
    ),
  ]);
  console.log(`Wrote ${cli.output}.md and ${cli.output}.json`);
}

async function runLive(
  cli: CliOptions,
  conditions: AdventureEvaluationCondition[],
): Promise<void> {
  const calls: ProxyCallRecord[] = [];
  const generation = createGenerationService(cli, calls);
  const results = await runSelectedConditions(
    cli,
    conditions,
    generation,
    calls,
  );
  const report = makeLiveReport(cli, conditions, results);
  await writeLiveReport(cli, report);
}

async function runCli(): Promise<void> {
  const cli = parseCli();
  const conditions = conditionsFor(cli);
  if (conditions.length === 0) {
    throw new Error("No evaluation conditions selected.");
  }
  if (!cli.live) {
    console.log(
      `No provider calls made. Selected ${conditions.length} conditions × ${cli.samples} sample(s) × ${GM_DIRECTOR_EVALUATION_STEPS.length} turns. Add --live to opt in.`,
    );
    return;
  }
  await runLive(cli, conditions);
}

async function main(): Promise<void> {
  await runCli();
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "evaluation-failed");
    process.exit(1);
  });
}
