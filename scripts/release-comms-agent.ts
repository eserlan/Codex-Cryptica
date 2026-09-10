import { execFileSync, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import {
  AGENT_PROVIDERS,
  resolveAgentExecutable,
  type AgentProviderName,
} from "./auto-degodify.ts";

const REPOSITORY_ROOT = process.env.PR_FIX_ROOT ?? process.cwd();
const TRACKING_ISSUE = Number(process.env.RELEASE_COMMS_TRACKING_ISSUE ?? 2906);
const DEFAULT_PROVIDERS: AgentProviderName[] = ["claude", "codex", "agy"];
const TIMEOUT_MINUTES = 10;

export interface ReleaseFeature {
  name: string;
  why_users_care: string;
}

export interface EvaluatorResult {
  postworthy: boolean;
  importance?: "low" | "medium" | "high";
  features?: ReleaseFeature[];
  recommended_channels?: string[];
  reason: string;
}

export interface ReleaseCommsHistoryEntry {
  sha: string;
  date: string;
  promoteRunId: string;
  postworthy: boolean;
  importance?: string;
  features?: ReleaseFeature[];
  recommendedChannels?: string[];
  reason: string;
}

export interface ReleaseCommsState {
  version: 1;
  lastEvaluatedSha: string | null;
  history: ReleaseCommsHistoryEntry[];
}

const EMPTY_STATE: ReleaseCommsState = {
  version: 1,
  lastEvaluatedSha: null,
  history: [],
};
const MAX_HISTORY = 50;

export function getReleaseCommsStatePath(): string {
  return (
    process.env.RELEASE_COMMS_STATE_FILE ??
    resolve(homedir(), ".local/state/codex-release-comms/state.json")
  );
}

export async function loadReleaseCommsState(
  path = getReleaseCommsStatePath(),
): Promise<ReleaseCommsState> {
  try {
    const parsed = JSON.parse(
      await readFile(path, "utf8"),
    ) as ReleaseCommsState;
    if (parsed.version === 1 && Array.isArray(parsed.history)) return parsed;
  } catch {
    // First run has no state file; corrupt state should not block evaluation.
  }
  return structuredClone(EMPTY_STATE);
}

export async function saveReleaseCommsState(
  state: ReleaseCommsState,
  path = getReleaseCommsStatePath(),
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

export function recordEvaluation(
  state: ReleaseCommsState,
  entry: ReleaseCommsHistoryEntry,
): ReleaseCommsState {
  return {
    version: 1,
    lastEvaluatedSha: entry.sha,
    history: [entry, ...state.history].slice(0, MAX_HISTORY),
  };
}

/** Durable per-run log path, mirroring `getPrFixLogPath` in pr-check-fix.ts. */
export function getReleaseCommsLogPath(
  promoteRunId: string,
  logDir = resolve(homedir(), ".local/state/codex-release-comms"),
): string {
  const safeId = promoteRunId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return resolve(logDir, `eval-${safeId}.log`);
}

/**
 * Extract a JSON object from agent stdout: prefers a fenced ```json block,
 * falls back to the first top-level `{...}` object in the raw text.
 */
export function extractJsonBlock(output: string): unknown | null {
  const fenced = output.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : output;
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objectMatch) return null;
  try {
    return JSON.parse(objectMatch[0]);
  } catch {
    return null;
  }
}

export function isEvaluatorResult(value: unknown): value is EvaluatorResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.postworthy === "boolean" &&
    typeof record.reason === "string" &&
    (record.features === undefined || Array.isArray(record.features)) &&
    (record.recommended_channels === undefined ||
      Array.isArray(record.recommended_channels))
  );
}

/** Pick the head SHA of the successful promote run immediately before `excludeRunId`. */
export function pickPreviousSha(
  runs: Array<{ databaseId: number; headSha: string }>,
  excludeRunId: number,
): string | null {
  const others = runs.filter((run) => run.databaseId !== excludeRunId);
  return others[0]?.headSha ?? null;
}

export function buildEvaluatorPrompt(input: {
  previousSha: string;
  newSha: string;
  commitLog: string;
  mergedPrs: string;
  changelogDiff: string;
}): string {
  return `You are the postworthiness evaluator for Codex Cryptica's release communications agent.

A production deploy just shipped everything between ${input.previousSha} and ${input.newSha}. Decide whether this release contains anything worth announcing publicly, and if so, group the changes into coherent user-facing features.

Postworthy examples: new generator, major generator enhancement, significant Vault capability, new interoperability/export/import feature, major public-facing UX improvement, new workflow that materially changes what users can do.

Not postworthy: dependency bumps, refactors, internal logging/analytics changes, CI/deployment plumbing, minor bug fixes users are unlikely to notice, tiny visual tweaks.

Commits in this range:
${input.commitLog || "(none)"}

Merged pull requests in this range:
${input.mergedPrs || "(none)"}

Changelog (releases.json) diff for this range, if any (this is the most reliable signal of genuinely user-facing work):
${input.changelogDiff || "(no changelog entry added in this range)"}

Respond with ONLY a single fenced \`\`\`json code block containing this exact shape, no other prose:

{
  "postworthy": true | false,
  "importance": "low" | "medium" | "high",
  "features": [
    { "name": "Feature Name", "why_users_care": "One sentence on why a GM/worldbuilder cares." }
  ],
  "recommended_channels": ["bluesky", "discord", "reddit"],
  "reason": "One or two sentences explaining the decision."
}

If nothing is postworthy, still return the object with "postworthy": false, an empty "features" array, an empty "recommended_channels" array, and a "reason" explaining why (e.g. "only dependency bumps and refactors").`;
}

interface CapturedAgentRun {
  status: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdout: string;
}

/**
 * Run an agent while forwarding output to a durable log file, same shape as
 * `runAgentWithLogging` in pr-check-fix.ts, but also buffers stdout so the
 * caller can parse the agent's structured JSON response.
 */
export async function runAgentCapturingOutput(
  binPath: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    timeoutMs: number;
    logPath: string;
    runId: string;
  },
): Promise<CapturedAgentRun> {
  await mkdir(resolve(options.logPath, ".."), { recursive: true });
  const log = createWriteStream(options.logPath, { flags: "a" });
  log.write(
    `\n=== agent started ${new Date().toISOString()} (${options.runId}) ===\n`,
  );

  const child = spawn(binPath, args, {
    cwd: options.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: options.env,
  });

  let stdoutBuffer = "";
  let timedOut = false;
  const heartbeat = setInterval(() => {
    const message = `[release-comms:${options.runId}] agent still running`;
    console.log(message);
    log.write(`${message}\n`);
  }, 30_000);

  child.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    stdoutBuffer += text;
    log.write(`[stdout] ${text}`);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    log.write(`[stderr] ${chunk.toString()}`);
  });

  const result = await new Promise<Omit<CapturedAgentRun, "stdout">>(
    (resolveResult) => {
      const timeout = setTimeout(() => {
        timedOut = true;
        log.write(
          `[release-comms:${options.runId}] timeout reached; terminating agent\n`,
        );
        child.kill("SIGTERM");
      }, options.timeoutMs);

      child.once("error", (error) => {
        clearTimeout(timeout);
        log.write(
          `[release-comms:${options.runId}] process error: ${error.message}\n`,
        );
        resolveResult({ status: null, signal: null, timedOut });
      });
      child.once("close", (status, signal) => {
        clearTimeout(timeout);
        resolveResult({ status, signal, timedOut });
      });
    },
  );

  clearInterval(heartbeat);
  log.write(
    `=== agent finished ${new Date().toISOString()} status=${result.status ?? "null"} timedOut=${result.timedOut} ===\n`,
  );
  await new Promise<void>((resolveLog) => log.end(resolveLog));
  return { ...result, stdout: stdoutBuffer };
}

/** Resolve the production commit SHA for a promote run, and the SHA it followed. */
function resolvePromoteShas(promoteRunId: string): {
  newSha: string;
  previousSha: string | null;
} {
  const newSha = execFileSync(
    "gh",
    ["run", "view", promoteRunId, "--json", "headSha", "--jq", ".headSha"],
    { cwd: REPOSITORY_ROOT, encoding: "utf-8" },
  ).trim();

  const runsRaw = execFileSync(
    "gh",
    [
      "run",
      "list",
      "--workflow",
      "Promote Staging to Production",
      "--status",
      "success",
      "--limit",
      "5",
      "--json",
      "databaseId,headSha",
    ],
    { cwd: REPOSITORY_ROOT, encoding: "utf-8" },
  );
  const runs = JSON.parse(runsRaw) as Array<{
    databaseId: number;
    headSha: string;
  }>;
  const previousSha = pickPreviousSha(runs, Number(promoteRunId));
  return { newSha, previousSha };
}

function gatherDelta(previousSha: string, newSha: string) {
  const commitLog = execFileSync(
    "git",
    ["log", `${previousSha}..${newSha}`, "--format=%H %as %s"],
    { cwd: REPOSITORY_ROOT, encoding: "utf-8" },
  ).trim();

  let mergedPrs = "";
  try {
    mergedPrs = execFileSync(
      "gh",
      [
        "pr",
        "list",
        "--state",
        "merged",
        "--base",
        "staging",
        "--limit",
        "30",
        "--json",
        "number,title,body",
        "--jq",
        '.[] | "#\\(.number) \\(.title)"',
      ],
      { cwd: REPOSITORY_ROOT, encoding: "utf-8" },
    ).trim();
  } catch {
    // Best-effort context only; the evaluator still has the commit log.
  }

  let changelogDiff = "";
  try {
    changelogDiff = execFileSync(
      "git",
      [
        "diff",
        previousSha,
        newSha,
        "--",
        "apps/web/src/lib/content/changelog/releases.json",
      ],
      { cwd: REPOSITORY_ROOT, encoding: "utf-8" },
    ).trim();
  } catch {
    // No changelog change in range.
  }

  return { commitLog, mergedPrs, changelogDiff };
}

async function runEvaluator(
  prompt: string,
  logPath: string,
  runId: string,
): Promise<EvaluatorResult | null> {
  for (const providerName of DEFAULT_PROVIDERS) {
    const binPath = resolveAgentExecutable(providerName);
    if (!binPath) continue;

    const providerConfig = AGENT_PROVIDERS[providerName];
    const args = providerConfig.getArgs(prompt, TIMEOUT_MINUTES);
    console.log(`[release-comms] running evaluator via ${providerName}`);

    const result = await runAgentCapturingOutput(binPath, args, {
      cwd: REPOSITORY_ROOT,
      env: { ...process.env, HUSKY: "0" },
      timeoutMs: TIMEOUT_MINUTES * 60 * 1000,
      logPath,
      runId,
    });

    if (result.status !== 0 || result.timedOut) {
      console.warn(
        `[release-comms] ${providerName} exited status=${result.status} timedOut=${result.timedOut}; trying next provider`,
      );
      continue;
    }

    const parsed = extractJsonBlock(result.stdout);
    if (isEvaluatorResult(parsed)) return parsed;

    console.warn(
      `[release-comms] ${providerName} produced no parseable JSON; see ${logPath}`,
    );
  }
  return null;
}

function formatIssueComment(
  entry: ReleaseCommsHistoryEntry,
  result: EvaluatorResult,
): string {
  const featureLines = (result.features ?? [])
    .map((feature) => `- **${feature.name}**: ${feature.why_users_care}`)
    .join("\n");
  const channels = (result.recommended_channels ?? []).join(", ") || "none";

  return [
    `### ${entry.postworthy ? "📣" : "🔇"} Release evaluation for \`${entry.sha.slice(0, 7)}\``,
    "",
    `**Postworthy:** ${entry.postworthy} (${entry.importance ?? "n/a"})`,
    `**Reason:** ${result.reason}`,
    entry.postworthy ? `**Recommended channels:** ${channels}` : "",
    featureLines ? `\n**Features:**\n${featureLines}` : "",
    "",
    "<details><summary>Raw evaluator output</summary>",
    "",
    "```json",
    JSON.stringify(result, null, 2),
    "```",
    "</details>",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function main(promoteRunId: string): Promise<void> {
  const state = await loadReleaseCommsState();
  const { newSha, previousSha: resolvedPreviousSha } =
    resolvePromoteShas(promoteRunId);

  if (state.lastEvaluatedSha === newSha) {
    console.log(`[release-comms] ${newSha} already evaluated; skipping`);
    return;
  }

  const previousSha = state.lastEvaluatedSha ?? resolvedPreviousSha;
  if (!previousSha) {
    console.warn(
      "[release-comms] no previous production SHA to diff against; skipping this run",
    );
    return;
  }

  const logPath = getReleaseCommsLogPath(promoteRunId);
  const delta = gatherDelta(previousSha, newSha);
  const prompt = buildEvaluatorPrompt({ previousSha, newSha, ...delta });

  const result = await runEvaluator(prompt, logPath, promoteRunId);
  if (!result) {
    console.error(
      `[release-comms] evaluator produced no usable result; see ${logPath}`,
    );
    return;
  }

  const entry: ReleaseCommsHistoryEntry = {
    sha: newSha,
    date: new Date().toISOString(),
    promoteRunId,
    postworthy: result.postworthy,
    importance: result.importance,
    features: result.features,
    recommendedChannels: result.recommended_channels,
    reason: result.reason,
  };
  await saveReleaseCommsState(recordEvaluation(state, entry));

  try {
    execFileSync(
      "gh",
      [
        "issue",
        "comment",
        String(TRACKING_ISSUE),
        "--body",
        formatIssueComment(entry, result),
      ],
      { cwd: REPOSITORY_ROOT, stdio: "inherit" },
    );
  } catch (error) {
    console.error(
      `[release-comms] could not comment on #${TRACKING_ISSUE}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

if (import.meta.main) {
  const promoteRunId = process.argv[2];
  if (!promoteRunId) {
    console.error("usage: release-comms-agent.ts <promoteRunId>");
    process.exit(1);
  }
  main(promoteRunId).catch((error) => {
    console.error(
      `[release-comms] unhandled error: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1);
  });
}
