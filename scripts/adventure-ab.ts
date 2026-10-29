/**
 * Adventure Idea A/B harness (#4135).
 *
 * Runs a fixed set of controlled cases through both the staged route
 * (situation, places and people, consequences) and the one-pass route, using
 * the same resolved prompt for both, so the only difference is the route.
 *
 *   bun scripts/adventure-ab.ts                  # needs a local proxy
 *   bun scripts/adventure-ab.ts --json > ab.json
 *   bun scripts/adventure-ab.ts --cases 3        # first three cases only
 *
 * ## Running it
 *
 * Like `scripts/heist-eval.ts`, this needs an LLM behind the local proxy:
 *
 *   1. put a provider key in `apps/workers/oracle-proxy/.dev.vars`
 *   2. `bun run dev:proxy`
 *   3. `bun scripts/adventure-ab.ts`
 *
 * It spends real tokens: about 3-6 calls per case on the staged route and
 * 1-2 on the one-pass route.
 *
 * ## What it measures
 *
 * Cost and latency (calls, milliseconds), how often the staged route fell
 * back, the one-pass checks still failing in the final document, grounding
 * (how many threats and outcomes name a place or person the document
 * established), whether a given situation's names survived, and variety
 * across cases. Coherence, specificity and usefulness are not scored: read
 * the `--json` output side by side for those.
 */

import { parseArgs } from "node:util";
import {
  buildAdventurePrompt,
  buildAdventureRetryMessage,
  parseAdventureResponseDetailed,
  type AdventureGeneratorOptions,
  type AdventurePrompt,
} from "../packages/generator-engine/src/public-adventure";
import {
  generateAdventureStaged,
  type AdventureStagedStats,
} from "../packages/generator-engine/src/adventure-staged";
import { extractProperNouns } from "../packages/generator-engine/src/campaign-context";
import type { PublicGeneratorOutput } from "../packages/generator-engine/src/public-generator-adapters";

export interface AbCase {
  id: string;
  /** The kind of pressure the case is meant to exercise. */
  pressure: string;
  options: AdventureGeneratorOptions;
}

/** Ten cases spanning genres and pressures, some with a binding situation. */
export const AB_CASES: AbCase[] = [
  {
    id: "fantasy-deadline-canon",
    pressure: "deadline",
    options: {
      themeId: "fantasy",
      seed: "Abbess Corvina must deliver the Saltmere Charter to the Queen's court before the solstice, or the abbey's lands are forfeit.",
    },
  },
  {
    id: "western-split-assets",
    pressure: "rival race",
    options: {
      themeId: "western",
      seed: "The Dunmore land deed was torn in three: one piece at the Gilt Spur Saloon, one with Marshal Ada Reyes, one buried at Coldwater Mine.",
    },
  },
  {
    id: "horror-social",
    pressure: "fragile relationship",
    options: {
      themeId: "horror",
      seed: "The Varga family's truce with the city's ghouls depends on a wedding no one wants. No deadline; the cost is trust.",
    },
  },
  {
    id: "scifi-resource",
    pressure: "dwindling resource",
    options: {
      themeId: "scifi",
      seed: "The colony ship Perihelion is losing coolant; Chief Engineer Tamsin Oyelaran suspects sabotage.",
    },
  },
  {
    id: "cyberpunk-cover-up",
    pressure: "cover-up",
    options: {
      themeId: "cyberpunk",
      seed: "Halcyon Biotech is wiping the memory of everyone who saw the Lot 9 trial.",
    },
  },
  {
    id: "pirate-pursuit",
    pressure: "active pursuit",
    options: { themeId: "pirate", archetype: "Escape & Survival" },
  },
  {
    id: "cosmic-escalation",
    pressure: "escalating crisis",
    options: { themeId: "cosmic_horror", scale: "Short Arc (2-3 Sessions)" },
  },
  {
    id: "apocalyptic-crackdown",
    pressure: "institutional crackdown",
    options: {
      themeId: "apocalyptic",
      seed: "The Water Board of New Kessel has sealed every well and is rationing by loyalty oath.",
    },
  },
  {
    id: "steampunk-window",
    pressure: "opportunity window",
    options: { themeId: "steampunk", archetype: "Heist & Infiltration" },
  },
  {
    id: "modern-consequences",
    pressure: "accumulating consequences",
    options: { themeId: "modern", scale: "One-Shot (1 Session)" },
  },
];

export interface RouteResult {
  route: "staged" | "one-pass";
  title: string;
  content: string;
  lore: string;
  calls: number;
  elapsedMs: number;
  /** Staged only: it gave up and the one-pass route would have run. */
  fellBack: boolean;
  remainingIssues: string[];
}

/** The text between a markdown heading and the next heading. */
function sectionUnder(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);
  if (start < 0) return "";
  const body = markdown.slice(start + heading.length);
  const end = body.search(/\n#{2,3} /);
  return end < 0 ? body : body.slice(0, end);
}

/** The `**Name**` labels of the bullets under a markdown heading. */
export function namesUnder(markdown: string, heading: string): string[] {
  return [
    ...sectionUnder(markdown, heading).matchAll(/^- \*\*(.+?)\*\*/gm),
  ].map((m) => m[1].trim());
}

/** The bullet lines under a markdown heading. */
function bulletsUnder(markdown: string, heading: string): string[] {
  return sectionUnder(markdown, heading)
    .split("\n")
    .filter((line) => line.startsWith("- "));
}

/**
 * Share of threats and outcomes that name a place or person the document
 * established, from 0 to 1. Ungrounded entries are the "late invention"
 * the staged route exists to prevent.
 */
export function grounding(
  result: Pick<RouteResult, "content" | "lore">,
): number {
  const doc = `${result.content}\n${result.lore}`;
  const established = [
    ...namesUnder(doc, "## Key Locations"),
    ...namesUnder(doc, "## Important NPCs & Factions"),
  ].map((n) => n.toLowerCase());
  const entries = [
    ...bulletsUnder(doc, "## Threats & Antagonists"),
    ...bulletsUnder(doc, "### Possible Outcomes"),
  ];
  if (entries.length === 0 || established.length === 0) return 0;
  const grounded = entries.filter((line) => {
    const lower = line.toLowerCase();
    return established.some((name) => lower.includes(name));
  });
  return grounded.length / entries.length;
}

/** Whether every name from the given situation survived. */
export function keepsSeedNames(
  options: AdventureGeneratorOptions,
  result: Pick<RouteResult, "content" | "lore" | "title">,
): boolean | null {
  const nouns = extractProperNouns(options.seed ?? "");
  if (nouns.length === 0) return null;
  const doc =
    `${result.title}\n${result.content}\n${result.lore}`.toLowerCase();
  return nouns.every((n) => doc.includes(n.toLowerCase()));
}

export interface RouteSummary {
  runs: number;
  medianCalls: number;
  medianMs: number;
  fellBack: number;
  withRemainingIssues: number;
  meanGrounding: number;
  seedNamesKept: string;
  distinctTitles: number;
}

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function summarise(
  rows: { case: AbCase; result: RouteResult }[],
): RouteSummary {
  // A run that fell back produced no document, so it is counted under
  // `fellBack` and left out of the quality measures.
  const produced = rows.filter((r) => !r.result.fellBack);
  const seeded = produced
    .map((r) => keepsSeedNames(r.case.options, r.result))
    .filter((k): k is boolean => k !== null);
  return {
    runs: rows.length,
    medianCalls: median(rows.map((r) => r.result.calls)),
    medianMs: median(rows.map((r) => r.result.elapsedMs)),
    fellBack: rows.filter((r) => r.result.fellBack).length,
    withRemainingIssues: rows.filter((r) => r.result.remainingIssues.length)
      .length,
    meanGrounding:
      produced.length === 0
        ? 0
        : produced.reduce((sum, r) => sum + grounding(r.result), 0) /
          produced.length,
    seedNamesKept: `${seeded.filter(Boolean).length}/${seeded.length}`,
    distinctTitles: new Set(produced.map((r) => r.result.title.toLowerCase()))
      .size,
  };
}

type Complete = (system: string, message: string) => Promise<string>;

export type ProxyComplete = Complete & {
  calls: number;
  failures: number;
  /** The proxy's `modelKey` for each successful call, in order. */
  models: string[];
};

/** The proxy request, asking for `modelKey` only when one is given. */
function proxyRequestBody(
  system: string,
  message: string,
  modelKey?: string,
): string {
  return JSON.stringify({
    operation: "freeform-generation",
    messages: [
      { role: "system", content: system },
      { role: "user", content: message },
    ],
    ...(modelKey ? { modelKeyOverride: modelKey } : {}),
  });
}

export interface ProxyOptions {
  /** A registry model key to use instead of the operation's default. */
  modelKey?: string;
  /** A session token, required by a deployed proxy; see mintAutomationToken. */
  sessionToken?: string;
}

function proxyHeaders(sessionToken?: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Origin: "http://localhost:5173",
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
  };
}

/**
 * Mint an automation session token from a deployed proxy, so a script can
 * call it without the browser's Turnstile check. The key and token are
 * never logged; a failure reports only the proxy's error code.
 */
export async function mintAutomationToken(
  proxy: string,
  automationKey: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const response = await fetcher(new URL("/api/session", proxy), {
    method: "POST",
    headers: { "X-Codex-Automation-Key": automationKey },
  });
  const reply = await readMintReply(response);
  if (response.ok && reply.token) return reply.token;
  throw mintError(response.status, reply);
}

interface MintReply {
  token?: string;
  error?: { code?: string };
}

async function readMintReply(response: Response): Promise<MintReply> {
  return response.json().catch(() => ({}));
}

function mintError(status: number, reply: MintReply): Error {
  const code = reply.error?.code ?? `HTTP ${status}`;
  return new Error(`Could not mint an automation session token (${code})`);
}

/**
 * A stateless call through a proxy, with calls and failures counted and the
 * model that answered each successful call recorded. A requested
 * `modelKey` still falls back if that model fails.
 */
export function proxyComplete(
  proxy: string,
  fetcher: typeof fetch = fetch,
  { modelKey, sessionToken }: ProxyOptions = {},
): ProxyComplete {
  const complete = async (system: string, message: string) => {
    complete.calls++;
    try {
      return await send(system, message);
    } catch (error) {
      complete.failures++;
      throw error;
    }
  };
  const send = async (system: string, message: string) => {
    const response = await fetcher(proxy, {
      method: "POST",
      headers: proxyHeaders(sessionToken),
      body: proxyRequestBody(system, message, modelKey),
    });
    const payload = (await response.json()) as {
      content?: string;
      modelKey?: string;
    };
    if (!response.ok) throw new Error(JSON.stringify(payload).slice(0, 200));
    complete.models.push(payload.modelKey ?? "unknown");
    return payload.content ?? "";
  };
  complete.calls = 0;
  complete.failures = 0;
  complete.models = [] as string[];
  return complete;
}

const NO_OUTPUT = { title: "", content: "", lore: "" };

function routeResult(
  route: RouteResult["route"],
  {
    title,
    content = "",
    lore = "",
  }: Pick<PublicGeneratorOutput, "title" | "content" | "lore">,
  run: Pick<
    RouteResult,
    "calls" | "elapsedMs" | "fellBack" | "remainingIssues"
  >,
): RouteResult {
  return { route, title, content, lore, ...run };
}

export async function runStaged(
  prompt: AdventurePrompt,
  options: AdventureGeneratorOptions,
  complete: Complete,
): Promise<RouteResult> {
  // Reported on every run that does not abort; an abort throws.
  let stats: Pick<
    AdventureStagedStats,
    "aiCalls" | "elapsedMs" | "remainingIssues"
  > = { aiCalls: 0, elapsedMs: 0, remainingIssues: [] };
  const result = await generateAdventureStaged(prompt, options, {
    complete,
    onStats: (s) => (stats = s),
  });
  return routeResult("staged", result?.output ?? NO_OUTPUT, {
    calls: stats.aiCalls,
    elapsedMs: stats.elapsedMs,
    fellBack: !result,
    remainingIssues: stats.remainingIssues,
  });
}

/** The one-pass route exactly as the public page runs it: one call, one repair. */
export async function runOnePass(
  prompt: AdventurePrompt,
  options: AdventureGeneratorOptions,
  complete: Complete,
  now: () => number = Date.now,
): Promise<RouteResult> {
  const started = now();
  let calls = 0;
  const call = (message: string) => {
    calls++;
    return complete(prompt.systemInstruction, message);
  };
  const parse = (text: string) =>
    parseAdventureResponseDetailed(text, options, undefined, prompt.resolved);
  let chosen = parse(await call(prompt.userMessage));
  if (chosen.problems.length > 0) {
    const second = parse(
      await call(
        buildAdventureRetryMessage(prompt.userMessage, chosen.problems),
      ),
    );
    if (second.problems.length === 0 || !second.rejected) chosen = second;
  }
  return routeResult("one-pass", chosen.output, {
    calls,
    elapsedMs: now() - started,
    fellBack: false,
    remainingIssues: chosen.problems,
  });
}

type Rows = { case: AbCase; result: RouteResult }[];

function notAProxyFailure(
  result: RouteResult,
  complete: ProxyComplete,
): RouteResult {
  if (result.fellBack && complete.failures > 0) {
    throw new Error(`the proxy failed ${complete.failures} time(s)`);
  }
  return result;
}

/**
 * Both routes for one case, from one shared prompt. The staged route treats a
 * failed call like an unreadable reply, so a staged run that fell back after
 * proxy failures is reported as an error, not as a fallback.
 */
export async function runCase(
  abCase: AbCase,
  connect: () => ProxyComplete,
  rows: { staged: Rows; onePass: Rows },
  errors: string[],
): Promise<void> {
  const prompt = buildAdventurePrompt(abCase.options);
  const routes = [
    ["staged", rows.staged, runStaged],
    ["one-pass", rows.onePass, runOnePass],
  ] as const;
  for (const [route, into, runRoute] of routes) {
    const complete = connect();
    try {
      const result = await runRoute(prompt, abCase.options, complete);
      into.push({ case: abCase, result: notAProxyFailure(result, complete) });
      process.stderr.write(`  ok  ${abCase.id} ${route}\n`);
    } catch (error) {
      errors.push(`${abCase.id} ${route}: ${String(error).slice(0, 160)}`);
      process.stderr.write(`  ERR ${abCase.id} ${route}\n`);
    }
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      proxy: { type: "string", default: "http://localhost:8787" },
      cases: { type: "string", default: String(AB_CASES.length) },
      json: { type: "boolean", default: false },
    },
  });
  const rows = { staged: [] as Rows, onePass: [] as Rows };
  const errors: string[] = [];
  for (const abCase of AB_CASES.slice(0, Number(values.cases))) {
    await runCase(abCase, () => proxyComplete(values.proxy), rows, errors);
  }
  report(rows, errors, values.json);
  if (errors.length) process.exitCode = 1;
}

function report(
  rows: { staged: Rows; onePass: Rows },
  errors: string[],
  json: boolean,
): void {
  const summary = {
    staged: summarise(rows.staged),
    onePass: summarise(rows.onePass),
  };
  if (json) {
    console.log(JSON.stringify({ summary, ...rows, errors }, null, 2));
    return;
  }
  console.table(summary);
  console.log(
    "Coherence, specificity and usefulness are not scored. Use --json and read the documents side by side.",
  );
  for (const error of errors) console.log(`error: ${error}`);
}

if (import.meta.main) {
  await main();
}
