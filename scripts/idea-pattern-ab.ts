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
 * assisted route. The analysis call goes through the same proxy model; to
 * try a smaller classifier (or Jev, #3465), give `analyseNarrativePatterns`
 * in `runRoute` a different completion.
 *
 * ## What it measures
 *
 * Cost and latency, which taxonomy patterns were found, how often the model
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
}

export const IDEA_CASES: IdeaCase[] = [
  {
    id: "dragon-protector",
    probe: "reveal-driven premise (the issue's example)",
    idea: "A disgraced knight discovers that the dragon terrorising the kingdom is actually protecting it from the king.",
  },
  {
    id: "dragon-parts-town",
    probe: "static lore with a mystery and no conflict yet",
    idea: "A town where everything is made from dragon parts, but there are no dragons nearby.",
  },
  {
    id: "giant-village",
    probe: "setting with built-in pressure",
    idea: "A village has built its homes inside the ribs of a sleeping giant, and the bones have started to move.",
  },
  {
    id: "vague-moon",
    probe: "too thin to classify safely",
    idea: "Something is wrong with the moon.",
  },
  {
    id: "water-rights-heist",
    probe: "clear job, unclear opposition",
    idea: "The crew must steal back a desert colony's water rights from the corporation that bought them at auction.",
  },
  {
    id: "drowned-city-ferry",
    probe: "investigation hook with a pattern hidden in it",
    idea: "A detective in a half-drowned city realises every missing person she has looked for this year rode the same night ferry.",
  },
  {
    id: "lighthouse-log",
    probe: "horror premise built on a single eerie fact",
    idea: "A lighthouse keeper's logbook records every ship that will sink, in her own handwriting, dated a century ago.",
  },
  {
    id: "bridge-toll",
    probe: "political premise with several familiar shapes",
    idea: "Two rival guilds share the only bridge across the river, and its architect has died without saying who inherits the toll.",
  },
  {
    id: "bakery-caravan",
    probe: "low-conflict, character-led premise",
    idea: "A travelling bakery caravan follows a festival circuit across the desert, and this year the festivals are being cancelled one by one.",
  },
  {
    id: "retired-chosen-one",
    probe: "premise that already subverts a familiar pattern",
    idea: "The chosen one fulfilled the prophecy twenty years ago; she now runs a tax office, and the dark lord she defeated is suing for compensation.",
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
}

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
  complete: Complete,
  now: () => number = Date.now,
): Promise<RouteRun> {
  let calls = 0;
  const counted: Complete = (system, message) => {
    calls++;
    return complete(system, message);
  };
  const started = now();
  let analysis: PatternAnalysis | null = null;
  try {
    let patternBrief = "";
    if (route === "assisted") {
      analysis = await analyseNarrativePatterns(ideaCase.idea, counted);
      patternBrief = formatPatternBrief(analysis);
    }
    const result = await developer(counted).develop(ideaCase.idea, mode, {
      patternBrief,
    });
    return {
      route,
      mode,
      calls,
      elapsedMs: now() - started,
      result,
      analysis,
      error: "",
    };
  } catch (error) {
    return {
      route,
      mode,
      calls,
      elapsedMs: now() - started,
      result: null,
      analysis,
      error: error instanceof Error ? error.message : String(error),
    };
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
  const text = visibleText(run.result, run.mode).toLowerCase();
  return NARRATIVE_PATTERNS.filter((p) =>
    text.includes(p.name.toLowerCase()),
  ).map((p) => p.name);
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
}

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
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
  };
}

/** How often each taxonomy pattern was matched across the assisted runs. */
export function patternCoverage(runs: RouteRun[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const run of runs) {
    for (const match of run.analysis?.patterns ?? []) {
      counts[match.pattern.id] = (counts[match.pattern.id] ?? 0) + 1;
    }
  }
  return counts;
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

function runMarkdown(run: RouteRun): string {
  const head = `### ${run.route} (calls: ${run.calls}, ${run.elapsedMs} ms)`;
  if (!run.result) return `${head}\n\n_Failed: ${run.error}_`;
  const leaked = leakedPatternNames(run);
  return [
    head,
    ...(leaked.length ? [`_Names patterns: ${leaked.join(", ")}_`] : []),
    ...(run.analysis ? [analysisMarkdown(run.analysis)] : []),
    visibleText(run.result, run.mode).replace(/^## /gm, "#### "),
  ].join("\n\n");
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
        runMarkdown(row.baseline),
        "",
        runMarkdown(row.assisted),
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

async function main() {
  const { values } = parseArgs({
    options: {
      proxy: { type: "string", default: "http://localhost:8787" },
      cases: { type: "string", default: String(IDEA_CASES.length) },
      modes: { type: "string", default: "assess,develop" },
      json: { type: "boolean", default: false },
      markdown: { type: "boolean", default: false },
    },
  });
  const modes = parseModes(values.modes);
  const rows: CaseRow[] = [];
  const connect = (): ProxyComplete => proxyComplete(values.proxy);
  for (const ideaCase of IDEA_CASES.slice(0, Number(values.cases))) {
    for (const mode of modes) {
      const baseline = await runRoute("baseline", ideaCase, mode, connect());
      const assisted = await runRoute("assisted", ideaCase, mode, connect());
      rows.push({ case: ideaCase, baseline, assisted });
      process.stderr.write(
        `  ${baseline.error || assisted.error ? "ERR" : "ok "} ${ideaCase.id} ${mode}\n`,
      );
    }
  }
  const summary = {
    baseline: summarise(rows.map((r) => r.baseline)),
    assisted: summarise(rows.map((r) => r.assisted)),
  };
  const coverage = patternCoverage(rows.map((r) => r.assisted));
  if (values.json) {
    console.log(JSON.stringify({ summary, coverage, rows }, null, 2));
  } else if (values.markdown) {
    console.log(toMarkdown(rows));
  } else {
    console.table(summary);
    console.table(coverage);
    console.log(
      "Usefulness is not scored. Use --markdown and read the routes side by side.",
    );
  }
  if (rows.some((r) => r.baseline.error || r.assisted.error)) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
