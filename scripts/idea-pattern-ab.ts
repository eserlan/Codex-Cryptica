/**
 * Idea Developer pattern-analysis A/B harness (#3466).
 *
 * Runs a fixed set of premises through Idea Developer twice per mode:
 *
 * - baseline: the public page's single call, unchanged
 * - assisted: a pattern-analysis call first, whose brief is passed to the
 *   same Idea Developer call
 *
 *   bun scripts/idea-pattern-ab.ts                       # needs a local proxy
 *   bun scripts/idea-pattern-ab.ts --modes assess,develop --cases 3
 *   bun scripts/idea-pattern-ab.ts --markdown > ab.md    # read side by side
 *   bun scripts/idea-pattern-ab.ts --json > ab.json
 *   bun scripts/idea-pattern-ab.ts --detect-only         # pattern-finding only
 *
 * ## Running it
 *
 * Like `scripts/adventure-ab.ts`, this needs an LLM behind the local proxy:
 *
 *   1. put a provider key in `apps/workers/oracle-proxy/.dev.vars`
 *   2. `bun run dev:proxy`
 *   3. `bun run eval:idea-patterns`
 *
 * Each case costs one call per mode on the baseline route and two on the
 * assisted route; `--detect-only` costs one call per case. The analysis call goes through the same proxy model; to
 * try a smaller classifier (or Jev, #3465), give `analyseNarrativePatterns`
 * in `runRoute` a different completion.
 *
 * ## What it measures
 *
 * Pattern-finding against hand labels: each case lists the patterns it
 * clearly uses (`expected`) and defensible extra readings (`acceptable`).
 * A missed expected pattern is a miss; a match that is neither is wrong.
 * The labels are one person's judgement; review them before trusting the
 * score.
 *
 * Also cost and latency, which taxonomy patterns were found, how often the model
 * reached for a pattern the taxonomy lacks, and whether assisted output
 * leaks pattern names into the creator-facing text. Usefulness is not
 * scored: read the `--markdown` output side by side.
 */

import { parseArgs } from "node:util";
import {
  IDEA_DEVELOPER_MODES,
  IdeaDeveloperService,
  toIdeaDeveloperMarkdown,
  type IdeaDeveloperMode,
  type IdeaDevelopment,
} from "../apps/web/src/lib/services/seo/idea-developer-service";
import {
  analyseNarrativePatterns,
  formatPatternBrief,
  type PatternAnalysis,
} from "../packages/generator-engine/src/narrative-pattern-analysis";
import { NARRATIVE_PATTERNS } from "../packages/generator-engine/src/narrative-patterns";
import { proxyComplete, type ProxyComplete } from "./adventure-ab";

export interface IdeaCase {
  id: string;
  /** What the case is meant to exercise. */
  probe: string;
  idea: string;
  /**
   * Hand-labelled taxonomy ids the premise clearly uses. Not finding one
   * counts as a miss.
   */
  expected: string[];
  /**
   * Defensible readings that are neither required nor wrong. Matching one
   * is not counted against the classifier.
   */
  acceptable: string[];
}

export const IDEA_CASES: IdeaCase[] = [
  {
    id: "dragon-protector",
    probe: "reveal-driven premise (the issue's example)",
    idea: "A disgraced knight discovers that the dragon terrorising the kingdom is actually protecting it from the king.",
    expected: ["disgraced-champion", "misunderstood-monster", "rot-at-the-top"],
    acceptable: ["truth-behind-the-legend"],
  },
  {
    id: "dragon-parts-town",
    probe: "static lore with a mystery and no conflict yet",
    idea: "A town where everything is made from dragon parts, but there are no dragons nearby.",
    expected: ["living-off-the-beast"],
    acceptable: ["the-town-keeps-a-secret"],
  },
  {
    id: "giant-village",
    probe: "setting with built-in pressure",
    idea: "A village has built its homes inside the ribs of a sleeping giant, and the bones have started to move.",
    expected: ["safe-haven-falls"],
    acceptable: ["living-off-the-beast", "sealed-thing-stirring"],
  },
  {
    id: "vague-moon",
    probe: "too thin to classify safely",
    idea: "Something is wrong with the moon.",
    expected: [],
    acceptable: [],
  },
  {
    id: "water-rights-heist",
    probe: "clear job, unclear opposition",
    idea: "The crew must steal back a desert colony's water rights from the corporation that bought them at auction.",
    expected: ["dwindling-lifeline"],
    acceptable: [],
  },
  {
    id: "drowned-city-ferry",
    probe: "investigation hook with no listed pattern",
    idea: "A detective in a half-drowned city realises every missing person she has looked for this year rode the same night ferry.",
    expected: [],
    acceptable: ["the-town-keeps-a-secret"],
  },
  {
    id: "lighthouse-log",
    probe: "horror premise built on a single eerie fact",
    idea: "A lighthouse keeper's logbook records every ship that will sink, in her own handwriting, dated a century ago.",
    expected: ["prophecy-trap"],
    acceptable: [],
  },
  {
    id: "bridge-toll",
    probe: "political premise with several familiar shapes",
    idea: "Two rival guilds share the only bridge across the river, and its architect has died without saying who inherits the toll.",
    expected: ["empty-throne", "fragile-truce"],
    acceptable: [],
  },
  {
    id: "bakery-caravan",
    probe: "low-conflict, character-led premise",
    idea: "A travelling bakery caravan follows a festival circuit across the desert, and this year the festivals are being cancelled one by one.",
    expected: [],
    acceptable: ["dwindling-lifeline"],
  },
  {
    id: "retired-chosen-one",
    probe: "premise that already subverts a familiar pattern",
    idea: "The chosen one fulfilled the prophecy twenty years ago; she now runs a tax office, and the dark lord she defeated is suing for compensation.",
    expected: [],
    acceptable: ["villain-has-better-evidence"],
  },
];

type Complete = (system: string, message: string) => Promise<string>;

export interface RouteRun {
  route: "baseline" | "assisted";
  mode: IdeaDeveloperMode;
  calls: number;
  elapsedMs: number;
  result: IdeaDevelopment | null;
  analysis: PatternAnalysis | null;
  error: string;
  /** The model that answered each successful call, when the proxy says. */
  models: string[];
}

/** A completion that may report which model answered, like `proxyComplete`. */
type ModelReportingComplete = Complete & { models?: string[] };

const modelsOf = (complete: ModelReportingComplete) => [
  ...(complete.models ?? []),
];

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

function developer(complete: Complete): IdeaDeveloperService {
  return new IdeaDeveloperService({
    runModel: (system, message) => complete(system, message),
  });
}

/** One route for one case and mode; failures are recorded, not thrown. */
export async function runRoute(
  route: RouteRun["route"],
  ideaCase: IdeaCase,
  mode: IdeaDeveloperMode,
  complete: ModelReportingComplete,
  now: () => number = Date.now,
): Promise<RouteRun> {
  let calls = 0;
  const counted: Complete = (system, message) => {
    calls++;
    return complete(system, message);
  };
  const started = now();
  let analysis: PatternAnalysis | null = null;
  const finish = (result: IdeaDevelopment | null, error: string): RouteRun => ({
    route,
    mode,
    calls,
    elapsedMs: now() - started,
    result,
    analysis,
    error,
    models: modelsOf(complete),
  });
  try {
    let patternBrief = "";
    if (route === "assisted") {
      analysis = await analyseNarrativePatterns(ideaCase.idea, counted);
      patternBrief = formatPatternBrief(analysis);
    }
    const result = await developer(counted).develop(ideaCase.idea, mode, {
      patternBrief,
    });
    return finish(result, "");
  } catch (error) {
    return finish(null, errorMessage(error));
  }
}

/** Creator-facing text of a result, as the page would render it. */
function visibleText(result: IdeaDevelopment, mode: IdeaDeveloperMode): string {
  return toIdeaDeveloperMarkdown(result, mode);
}

/**
 * Taxonomy pattern names that appear in the creator-facing output. The
 * assisted prompt asks the model not to label the idea with them.
 */
export function leakedPatternNames(run: RouteRun): string[] {
  if (!run.result) return [];
  const text = visibleText(run.result, run.mode);
  return NARRATIVE_PATTERNS.filter((p) => namesPhrase(text, p.name)).map(
    (p) => p.name,
  );
}

/** A whole-phrase match, so "hidden heirloom" does not count as "Hidden Heir". */
function namesPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "iu",
  ).test(text);
}

export interface RouteSummary {
  runs: number;
  failed: number;
  medianCalls: number;
  medianMs: number;
  /** Assisted only: mean taxonomy matches and off-list patterns per idea. */
  meanPatterns: number;
  meanOffList: number;
  /** Runs whose visible text names a taxonomy pattern. */
  leakedRuns: number;
  /** Calls answered per model, e.g. "luna-fast × 18, gemini-flash-lite × 2". */
  models: string;
}

/**
 * How many calls each model answered across runs. The proxy falls back
 * silently, so a mixed result here means the run is not one model's.
 */
export function modelCounts(perRun: string[][]): string {
  const all = perRun.flat();
  if (all.length === 0) return "not reported";
  return [...new Set(all)]
    .map((m) => `${m} × ${all.filter((x) => x === m).length}`)
    .join(", ");
}

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const mean = (xs: number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

export function summarise(runs: RouteRun[]): RouteSummary {
  const analysed = runs.flatMap((r) => (r.analysis ? [r.analysis] : []));
  return {
    runs: runs.length,
    failed: runs.filter((r) => r.error).length,
    medianCalls: median(runs.map((r) => r.calls)),
    medianMs: median(runs.map((r) => r.elapsedMs)),
    meanPatterns: mean(analysed.map((a) => a.patterns.length)),
    meanOffList: mean(analysed.map((a) => a.otherPatterns.length)),
    leakedRuns: runs.filter((r) => leakedPatternNames(r).length > 0).length,
    models: modelCounts(runs.map((r) => r.models)),
  };
}

/** How often each taxonomy pattern was matched across the assisted runs. */
export function patternCoverage(runs: RouteRun[]): Record<string, number> {
  const ids = runs.flatMap(
    (run) => run.analysis?.patterns.map((m) => m.pattern.id) ?? [],
  );
  return Object.fromEntries(
    [...new Set(ids)].map((id) => [id, ids.filter((x) => x === id).length]),
  );
}

export interface PatternScore {
  caseId: string;
  /** The Idea Developer mode, or "detect" for a detection-only run. */
  label: string;
  /** Expected patterns the classifier found. */
  hits: string[];
  /** Expected patterns it did not find. */
  missed: string[];
  /** Matches that are neither expected nor acceptable. */
  wrong: string[];
  /** Off-list names, reported but not scored. */
  offList: string[];
}

/**
 * Score one analysis against a case's hand labels; null when there is no
 * analysis (the baseline route, or a failed classifier call).
 */
export function scorePatterns(
  ideaCase: IdeaCase,
  analysis: PatternAnalysis | null,
  label: string,
): PatternScore | null {
  if (!analysis) return null;
  const found = new Set(analysis.patterns.map((m) => m.pattern.id));
  const allowed = new Set([...ideaCase.expected, ...ideaCase.acceptable]);
  return {
    caseId: ideaCase.id,
    label,
    hits: ideaCase.expected.filter((id) => found.has(id)),
    missed: ideaCase.expected.filter((id) => !found.has(id)),
    wrong: [...found].filter((id) => !allowed.has(id)),
    offList: analysis.otherPatterns.map((o) => o.name),
  };
}

export interface DetectionRun {
  ideaCase: IdeaCase;
  analysis: PatternAnalysis | null;
  error: string;
  models: string[];
}

/** The classifier alone, for scoring pattern-finding without development. */
export async function runDetection(
  ideaCase: IdeaCase,
  complete: ModelReportingComplete,
): Promise<DetectionRun> {
  try {
    const analysis = await analyseNarrativePatterns(ideaCase.idea, complete);
    return { ideaCase, analysis, error: "", models: modelsOf(complete) };
  } catch (error) {
    return {
      ideaCase,
      analysis: null,
      error: errorMessage(error),
      models: modelsOf(complete),
    };
  }
}

export interface DetectionSummary {
  /** Analyses scored. */
  scored: number;
  /** Expected patterns found, as "found/expected". */
  found: string;
  missed: number;
  wrong: number;
  /** Analyses with no misses and no wrong matches. */
  exact: number;
}

export function summariseDetection(scores: PatternScore[]): DetectionSummary {
  const hits = scores.reduce((n, s) => n + s.hits.length, 0);
  const missed = scores.reduce((n, s) => n + s.missed.length, 0);
  return {
    scored: scores.length,
    found: `${hits}/${hits + missed}`,
    missed,
    wrong: scores.reduce((n, s) => n + s.wrong.length, 0),
    exact: scores.filter((s) => !s.missed.length && !s.wrong.length).length,
  };
}

function scoreRows(rows: CaseRow[]): PatternScore[] {
  return rows.flatMap(
    (row) =>
      scorePatterns(row.case, row.assisted.analysis, row.assisted.mode) ?? [],
  );
}

function scoreMarkdown(score: PatternScore): string {
  const list = (ids: string[]) => (ids.length ? ids.join(", ") : "none");
  return `_Pattern score: found ${list(score.hits)}; missed ${list(score.missed)}; wrong ${list(score.wrong)}._`;
}

export interface CaseRow {
  case: IdeaCase;
  baseline: RouteRun;
  assisted: RouteRun;
}

function analysisMarkdown(analysis: PatternAnalysis): string {
  const found = analysis.patterns.map(
    (m) => `- **${m.pattern.name}**: ${m.evidence}`,
  );
  const other = analysis.otherPatterns.map(
    (o) => `- _off-list_ **${o.name}**: ${o.evidence}`,
  );
  return [
    "#### Pattern analysis",
    ...found,
    ...other,
    "",
    "```text",
    formatPatternBrief(analysis),
    "```",
  ].join("\n");
}

function runMarkdown(run: RouteRun, ideaCase: IdeaCase): string {
  const models = run.models.join(", ") || "not reported";
  const head = `### ${run.route} (calls: ${run.calls}, ${run.elapsedMs} ms, models: ${models})`;
  const score = scorePatterns(ideaCase, run.analysis, run.mode);
  const body = run.result
    ? resultMarkdown(run, run.result)
    : [`_Failed: ${run.error}_`];
  return [head, ...(score ? [scoreMarkdown(score)] : []), ...body].join("\n\n");
}

function resultMarkdown(run: RouteRun, result: IdeaDevelopment): string[] {
  const leaked = leakedPatternNames(run);
  return [
    ...(leaked.length ? [`_Names patterns: ${leaked.join(", ")}_`] : []),
    ...(run.analysis ? [analysisMarkdown(run.analysis)] : []),
    visibleText(result, run.mode).replace(/^## /gm, "#### "),
  ];
}

/** Every case with both routes one after the other, for reading. */
export function toMarkdown(rows: CaseRow[]): string {
  return rows
    .map((row) =>
      [
        `## ${row.case.id} · ${row.baseline.mode}`,
        `_${row.case.probe}_`,
        "",
        `> ${row.case.idea}`,
        "",
        runMarkdown(row.baseline, row.case),
        "",
        runMarkdown(row.assisted, row.case),
      ].join("\n"),
    )
    .join("\n\n---\n\n");
}

export function parseModes(value: string): IdeaDeveloperMode[] {
  const modes = value.split(",").map((m) => m.trim()) as IdeaDeveloperMode[];
  const bad = modes.filter((m) => !IDEA_DEVELOPER_MODES.includes(m));
  if (bad.length || modes.length === 0) {
    throw new Error(`Unknown mode(s): ${bad.join(", ") || "(none)"}`);
  }
  return modes;
}

const rowFailed = (row: CaseRow) =>
  Boolean(row.baseline.error || row.assisted.error);

const progress = (failed: boolean, label: string) =>
  process.stderr.write(`  ${failed ? "ERR" : "ok "} ${label}\n`);

function parseCli() {
  return parseArgs({
    options: {
      proxy: { type: "string", default: "http://localhost:8787" },
      cases: { type: "string", default: String(IDEA_CASES.length) },
      modes: { type: "string", default: "assess,develop" },
      json: { type: "boolean", default: false },
      markdown: { type: "boolean", default: false },
      "detect-only": { type: "boolean", default: false },
    },
  }).values;
}

async function main() {
  const values = parseCli();
  const cases = IDEA_CASES.slice(0, Number(values.cases));
  const connect = (): ProxyComplete => proxyComplete(values.proxy);
  if (values["detect-only"]) {
    await detectOnly(cases, connect, values.json);
    return;
  }
  const rows = await runComparison(cases, parseModes(values.modes), connect);
  reportComparison(rows, values);
  if (rows.some(rowFailed)) process.exitCode = 1;
}

async function runComparison(
  cases: IdeaCase[],
  modes: IdeaDeveloperMode[],
  connect: () => ProxyComplete,
): Promise<CaseRow[]> {
  const rows: CaseRow[] = [];
  for (const ideaCase of cases) {
    for (const mode of modes) {
      const baseline = await runRoute("baseline", ideaCase, mode, connect());
      const assisted = await runRoute("assisted", ideaCase, mode, connect());
      const row = { case: ideaCase, baseline, assisted };
      rows.push(row);
      progress(rowFailed(row), `${ideaCase.id} ${mode}`);
    }
  }
  return rows;
}

function reportComparison(
  rows: CaseRow[],
  { json, markdown }: { json: boolean; markdown: boolean },
): void {
  const summary = {
    baseline: summarise(rows.map((r) => r.baseline)),
    assisted: summarise(rows.map((r) => r.assisted)),
  };
  const coverage = patternCoverage(rows.map((r) => r.assisted));
  const scores = scoreRows(rows);
  if (json) {
    const detection = summariseDetection(scores);
    console.log(
      JSON.stringify({ summary, detection, scores, coverage, rows }, null, 2),
    );
    return;
  }
  if (markdown) {
    console.log(toMarkdown(rows));
    return;
  }
  console.table(summary);
  printScores(scores, [], summary.assisted.models);
  console.table(coverage);
  console.log(
    "Usefulness is not scored. Use --markdown and read the routes side by side.",
  );
}

/** One classifier call per case, scored against the hand labels. */
async function detectOnly(
  cases: IdeaCase[],
  connect: () => ProxyComplete,
  json: boolean,
): Promise<void> {
  const runs = await collectDetections(cases, connect);
  const scores = runs.flatMap(
    (r) => scorePatterns(r.ideaCase, r.analysis, "detect") ?? [],
  );
  const errors = runs.filter((r) => r.error).map((r) => r.ideaCase.id);
  const models = modelCounts(runs.map((r) => r.models));
  if (json) {
    const detection = { ...summariseDetection(scores), models };
    console.log(JSON.stringify({ detection, scores, errors, runs }, null, 2));
  } else {
    printScores(scores, errors, models);
  }
  if (errors.length) process.exitCode = 1;
}

async function collectDetections(
  cases: IdeaCase[],
  connect: () => ProxyComplete,
): Promise<DetectionRun[]> {
  const runs: DetectionRun[] = [];
  for (const ideaCase of cases) {
    const run = await runDetection(ideaCase, connect());
    runs.push(run);
    progress(Boolean(run.error), ideaCase.id);
  }
  return runs;
}

function printScores(
  scores: PatternScore[],
  errors: string[],
  models: string,
): void {
  for (const id of errors) console.log(`error: ${id}`);
  console.table({ ...summariseDetection(scores), models });
  console.table(
    scores.map((s) => ({
      case: s.caseId,
      run: s.label,
      found: s.hits.join(", "),
      missed: s.missed.join(", "),
      wrong: s.wrong.join(", "),
      offList: s.offList.join(", "),
    })),
  );
}

if (import.meta.main) {
  await main();
}
