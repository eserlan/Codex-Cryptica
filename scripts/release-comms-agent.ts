import { execFileSync, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  AGENT_PROVIDERS,
  resolveAgentExecutable,
  type AgentProviderName,
} from "./auto-degodify.ts";
import {
  buildEvaluatorPrompt,
  buildWriterPrompt,
  formatIssueComment,
} from "./release-comms-prompts.ts";
import {
  getReleaseCommsLogPath,
  isEvaluatorResult,
  isWriterResult,
  loadReleaseCommsState,
  recordEvaluation,
  saveReleaseCommsState,
} from "./release-comms-state.ts";
import type {
  ReleaseCommsHistoryEntry,
  WriterResult,
} from "./release-comms-types.ts";

export { buildEvaluatorPrompt, buildWriterPrompt } from "./release-comms-prompts.ts";
export {
  getReleaseCommsLogPath,
  isEvaluatorResult,
  isWriterResult,
  loadReleaseCommsState,
  recordEvaluation,
  saveReleaseCommsState,
  getReleaseCommsStatePath,
} from "./release-comms-state.ts";
export type {
  ReleaseFeature,
  EvaluatorResult,
  WriterResult,
  ReleaseCommsHistoryEntry,
  ReleaseCommsState,
} from "./release-comms-types.ts";

const REPOSITORY_ROOT = process.env.PR_FIX_ROOT ?? process.cwd();
const TRACKING_ISSUE = Number(process.env.RELEASE_COMMS_TRACKING_ISSUE ?? 2906);
const DEFAULT_PROVIDERS: AgentProviderName[] = ["claude", "codex", "agy"];
const TIMEOUT_MINUTES = 10;

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

/**
 * Pick the head SHA of the most recent successful promote run other than
 * `excludeRunId` (typically the currently-running promote), from `runs`
 * ordered most-recent-first. This is NOT "the run immediately before
 * `excludeRunId` in that ordering" — it's simply the first remaining entry
 * after filtering `excludeRunId` out, so if `excludeRunId` isn't present in
 * `runs` at all, this just returns the most recent run.
 */
export function pickPreviousSha(
  runs: Array<{ databaseId: number; headSha: string }>,
  excludeRunId: number,
): string | null {
  const others = runs.filter((run) => run.databaseId !== excludeRunId);
  return others[0]?.headSha ?? null;
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

/**
 * Run a prompt through the provider fallback chain until one returns a
 * parseable, schema-valid JSON result. Shared by the evaluator and writer
 * passes, which differ only in their prompt and expected output shape.
 */
async function runJsonAgentPass<T>(
  prompt: string,
  logPath: string,
  runId: string,
  isValid: (value: unknown) => value is T,
  passName: string,
): Promise<T | null> {
  for (const providerName of DEFAULT_PROVIDERS) {
    const binPath = resolveAgentExecutable(providerName);
    if (!binPath) continue;

    const providerConfig = AGENT_PROVIDERS[providerName];
    const args = providerConfig.getArgs(prompt, TIMEOUT_MINUTES);
    console.log(`[release-comms] running ${passName} via ${providerName}`);

    const result = await runAgentCapturingOutput(binPath, args, {
      cwd: REPOSITORY_ROOT,
      env: { ...process.env, HUSKY: "0" },
      timeoutMs: TIMEOUT_MINUTES * 60 * 1000,
      logPath,
      runId: `${runId}-${passName}`,
    });

    if (result.status !== 0 || result.timedOut) {
      console.warn(
        `[release-comms] ${providerName} (${passName}) exited status=${result.status} timedOut=${result.timedOut}; trying next provider`,
      );
      continue;
    }

    const parsed = extractJsonBlock(result.stdout);
    if (isValid(parsed)) return parsed;

    console.warn(
      `[release-comms] ${providerName} (${passName}) produced no parseable JSON; see ${logPath}`,
    );
  }
  return null;
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
  const evaluatorPrompt = buildEvaluatorPrompt({
    previousSha,
    newSha,
    ...delta,
  });

  const result = await runJsonAgentPass(
    evaluatorPrompt,
    logPath,
    promoteRunId,
    isEvaluatorResult,
    "evaluate",
  );
  if (!result) {
    console.error(
      `[release-comms] evaluator produced no usable result; see ${logPath}`,
    );
    return;
  }

  let drafts: WriterResult | null = null;
  if (result.postworthy) {
    drafts = await runJsonAgentPass(
      buildWriterPrompt(result),
      logPath,
      promoteRunId,
      isWriterResult,
      "write",
    );
    if (!drafts) {
      console.error(
        `[release-comms] writer produced no usable drafts; see ${logPath}`,
      );
    }
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
    drafts: drafts ?? undefined,
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
        formatIssueComment(entry, result, drafts),
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
