import { execFileSync, spawn } from "node:child_process";
import { createWriteStream, readFileSync } from "node:fs";
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
  deriveDiscordFromBluesky,
  loadDiscordConfig,
  publishToDiscord,
} from "./release-comms-discord.ts";
import {
  insertTrackerRow,
  updateTrackerPlatformStatus,
} from "./release-comms-queue.ts";
import {
  BLUESKY_CHARACTER_LIMIT,
  blueskyTextLength,
  isReleaseCommsDryRun,
  publishBlueskyPost,
  publishDiscussion,
} from "./release-comms-publish.ts";
import { resolveSocialAsset } from "./release-comms-image.ts";
import {
  discoverGeneratorPublicContent,
  discoverPublicContent,
  type PublicContentItem,
} from "./release-comms-content.ts";
import {
  getReleaseCommsLogPath,
  isEvaluatorResult,
  isWriterResult,
  loadReleaseCommsState,
  recordEvaluation,
  saveReleaseCommsState,
} from "./release-comms-state.ts";
import type {
  EvaluatorResult,
  ReleaseCommsHistoryEntry,
  WriterResult,
} from "./release-comms-types.ts";

export {
  buildEvaluatorPrompt,
  buildWriterPrompt,
} from "./release-comms-prompts.ts";
export {
  deriveDiscordFromBluesky,
  loadDiscordConfig,
  publishToDiscord,
  stripHashtags,
} from "./release-comms-discord.ts";
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

/**
 * Promotion webhooks provide commit SHAs, but the listener's checkout may not
 * have fetched the production ref that contains them. Fetch both endpoints
 * before deriving a range so a newly promoted release can always be evaluated.
 */
export function fetchPromotionCommits(
  previousSha: string,
  newSha: string,
  run: typeof execFileSync = execFileSync,
): void {
  if (previousSha.startsWith("-") || newSha.startsWith("-")) {
    throw new Error(
      `[release-comms] invalid promotion SHA(s): previous=${previousSha} new=${newSha}`,
    );
  }

  try {
    run("git", ["fetch", "--no-tags", "origin", previousSha, newSha], {
      cwd: REPOSITORY_ROOT,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr?: Buffer | string }).stderr ?? "").trim()
        : "";
    const details = stderr ? `\n${stderr}` : "";

    throw new Error(
      `[release-comms] git fetch failed for ${previousSha}..${newSha}: ${message}${details}`,
      { cause: error },
    );
  }
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

export function findPublicContent(
  previousSha: string,
  newSha: string,
): PublicContentItem[] {
  const changedFiles = execFileSync(
    "git",
    [
      "diff",
      "--name-status",
      previousSha,
      newSha,
      "--",
      "apps/web/src/lib/content",
      "apps/web/src/routes/(marketing)/tools",
      "apps/web/src/lib/components/seo/generator-page-meta.ts",
    ],
    { cwd: REPOSITORY_ROOT, encoding: "utf-8" },
  )
    .trim()
    .split("\n")
    .flatMap((line) => {
      const [status, ...paths] = line.split("\t");
      // Renames/copies report three columns (e.g. "R100\told\tnew"); the
      // destination path is always the last column.
      const path = paths.at(-1);
      return status && path && !status.startsWith("D") ? [path] : [];
    });
  return changedFiles.flatMap((path) => {
    try {
      const source = execFileSync("git", ["show", `${newSha}:${path}`], {
        cwd: REPOSITORY_ROOT,
        encoding: "utf-8",
      });
      if (path.endsWith("/generator-page-meta.ts")) {
        const changedGeneratorSlugs =
          execFileSync(
            "git",
            ["diff", "--unified=0", previousSha, newSha, "--", path],
            { cwd: REPOSITORY_ROOT, encoding: "utf-8" },
          )
            .match(/^\+ {2}["']?([a-z0-9-]+)["']?: \{$/gm)
            ?.map(
              (line) => line.match(/^\+ {2}["']?([a-z0-9-]+)["']?: \{$/)![1],
            ) ?? [];
        return changedGeneratorSlugs.flatMap((slug) => {
          const item = discoverGeneratorPublicContent(source, slug, path);
          return item ? [item] : [];
        });
      }
      const item = discoverPublicContent(path, source);
      return item ? [item] : [];
    } catch {
      // A renamed/deleted path can disappear between name-status and show.
      return [];
    }
  });
}

export function publicPageFor(
  items: PublicContentItem[],
  pageUrl: string,
): PublicContentItem {
  const item = items.find((candidate) => candidate.url === pageUrl);
  if (!item) {
    throw new Error(
      `Writer referenced a public page outside this release: ${pageUrl}`,
    );
  }
  return item;
}

/** Recent Announcements titles, used to calibrate the Reddit/Discussion bar against real history. */
function fetchRecentDiscussionTitles(): string {
  try {
    const raw = execFileSync(
      "gh",
      [
        "api",
        "graphql",
        "-f",
        'query=query{repository(owner:"eserlan",name:"Codex-Cryptica"){discussions(first:8, categoryId:"DIC_kwDOQ_4bts4C-hhd", orderBy:{field:CREATED_AT,direction:DESC}){nodes{title createdAt}}}}',
      ],
      { cwd: REPOSITORY_ROOT, encoding: "utf-8" },
    );
    const parsed = JSON.parse(raw) as {
      data: {
        repository: {
          discussions: { nodes: Array<{ title: string; createdAt: string }> };
        };
      };
    };
    return parsed.data.repository.discussions.nodes
      .map((node) => `- ${node.createdAt.slice(0, 10)}: ${node.title}`)
      .join("\n");
  } catch {
    return "";
  }
}

/** Recent Bluesky post/draft headers, used to avoid recommending something already just posted. */
function fetchRecentBlueskyTitles(): string {
  try {
    const content = readFileSync(
      resolve(REPOSITORY_ROOT, ".social/bluesky-posts.md"),
      "utf8",
    );
    return (content.match(/^### .+$/gm) ?? []).slice(0, 15).join("\n");
  } catch {
    return "";
  }
}

/** Bounds the cost of re-asking a provider to shorten an over-budget Bluesky draft. */
const MAX_BLUESKY_BUDGET_ATTEMPTS = 4;

export interface OversizedBlueskyDraft {
  pageUrl: string;
  length: number;
}

/** Quality-assess the writer pass's Bluesky drafts against the real character budget, once the page URL is resolved in. */
export function findOversizedBlueskyDrafts(
  drafts: WriterResult,
): OversizedBlueskyDraft[] {
  return drafts.bluesky
    .map((draft) => ({
      pageUrl: draft.pageUrl,
      length: blueskyTextLength(draft.text, draft.pageUrl),
    }))
    .filter((draft) => draft.length > BLUESKY_CHARACTER_LIMIT);
}

/** Ask the writer to resubmit ONLY the flagged Bluesky post(s), shortened — never the full result, so Reddit/Discussion text and every other Bluesky draft can't be silently changed or dropped by the retry. */
export function buildWriterRetryPrompt(
  basePrompt: string,
  oversized: OversizedBlueskyDraft[],
): string {
  const notes = oversized
    .map(
      (draft) =>
        `- ${draft.pageUrl}: ${draft.length} characters (${draft.length - BLUESKY_CHARACTER_LIMIT} over the ${BLUESKY_CHARACTER_LIMIT}-character limit), counting the page URL and hashtags already appended`,
    )
    .join("\n");
  return `${basePrompt}

Your previous response is REJECTED: the following Bluesky post(s), once the page URL is appended, exceed Bluesky's hard ${BLUESKY_CHARACTER_LIMIT}-character limit:
${notes}

Do NOT resend reddit, discord, github_discussions, or any Bluesky post that isn't listed above — only rewrite the flagged post(s). Shorten each one so the complete text — including its URL and hashtags — is comfortably under ${BLUESKY_CHARACTER_LIMIT} characters, aiming for 220 characters or fewer before the URL and hashtags are added, same as the original instructions. Respond with ONLY a fenced \`\`\`json code block containing an object with a single "bluesky" array, one entry per flagged pageUrl, e.g. {"bluesky":[{"pageUrl":"<one of the URLs above>","text":"<shortened post text>"}]}. No other prose.`;
}

export interface BlueskyRetryResult {
  bluesky: Array<{ pageUrl: string; text: string }>;
}

function isBlueskyRetryResult(value: unknown): value is BlueskyRetryResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.bluesky) &&
    record.bluesky.length > 0 &&
    record.bluesky.every(
      (post) =>
        !!post &&
        typeof post === "object" &&
        typeof (post as Record<string, unknown>).pageUrl === "string" &&
        typeof (post as Record<string, unknown>).text === "string",
    )
  );
}

/** Replaces only the flagged Bluesky post(s) in `previous` with the retry's rewrites; reddit, discord, github_discussions, and any unflagged Bluesky post pass through untouched. */
export function mergeBlueskyRetry(
  previous: WriterResult,
  retry: BlueskyRetryResult,
): WriterResult {
  const rewritten = new Map(
    retry.bluesky.map((post) => [post.pageUrl, post.text]),
  );
  return {
    ...previous,
    bluesky: previous.bluesky.map((post) =>
      rewritten.has(post.pageUrl)
        ? { ...post, text: rewritten.get(post.pageUrl)! }
        : post,
    ),
  };
}

/**
 * Run the writer pass, and if it comes back with any Bluesky draft over
 * budget, ask it to shorten just that draft and try again — up to
 * MAX_BLUESKY_BUDGET_ATTEMPTS times — rather than letting an oversized post
 * crash the whole run at publish time. Each retry response is merged back
 * into the last full result so unflagged content is never at risk. If it
 * still doesn't fit after every attempt (or a retry returns no parseable
 * JSON), drop the still-oversized post(s) (loudly) instead of blocking
 * every other channel on it.
 */
export async function runWriterPassWithBudgetRetries(
  evaluation: EvaluatorResult,
  publicContent: PublicContentItem[],
  logPath: string,
  runId: string,
  runPass: typeof runJsonAgentPass = runJsonAgentPass,
): Promise<WriterResult | null> {
  const basePrompt = buildWriterPrompt(evaluation, publicContent);
  const parsed = await runPass(
    basePrompt,
    logPath,
    runId,
    isWriterResult,
    "write",
  );
  if (!parsed) return null;

  let lastResult = parsed;
  let oversized = findOversizedBlueskyDrafts(lastResult);

  for (
    let attempt = 1;
    oversized.length > 0 && attempt < MAX_BLUESKY_BUDGET_ATTEMPTS;
    attempt++
  ) {
    console.warn(
      `[release-comms] ${oversized.length} Bluesky draft(s) over the ${BLUESKY_CHARACTER_LIMIT}-character budget (attempt ${attempt}/${MAX_BLUESKY_BUDGET_ATTEMPTS}); asking for a rewrite`,
    );
    const retryResult = await runPass(
      buildWriterRetryPrompt(basePrompt, oversized),
      logPath,
      runId,
      isBlueskyRetryResult,
      `write-retry-${attempt}`,
    );
    if (!retryResult) break;

    lastResult = mergeBlueskyRetry(lastResult, retryResult);
    oversized = findOversizedBlueskyDrafts(lastResult);
  }

  if (oversized.length > 0) {
    console.error(
      `[release-comms] giving up on ${oversized.length} Bluesky draft(s) still over budget after ${MAX_BLUESKY_BUDGET_ATTEMPTS} attempts; skipping them: ${oversized.map((draft) => draft.pageUrl).join(", ")}`,
    );
    return {
      ...lastResult,
      bluesky: lastResult.bluesky.filter(
        (draft) => !oversized.some((o) => o.pageUrl === draft.pageUrl),
      ),
    };
  }
  return lastResult;
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

export interface DiscordQualificationResult {
  recommendedChannels: string[] | undefined;
  /** Derived Discord copy, or undefined if there is no Bluesky copy to derive it from. */
  discordCopy: string | undefined;
}

/**
 * Decide whether a release qualifies for Discord and, if so, derive its copy.
 * A release qualifies whenever Bluesky drafts exist or any feature was
 * marked bluesky_worthy — but copy can only be derived from actual Bluesky
 * drafts, so a worthy-but-draftless release qualifies without copy.
 */
export function deriveDiscordQualification(
  result: EvaluatorResult,
  drafts: WriterResult,
): DiscordQualificationResult {
  const hasBlueskyDrafts = Boolean(
    drafts.bluesky && drafts.bluesky.length > 0,
  );
  const hasBlueskyWorthy = Boolean(
    result.features?.some((f) => f.bluesky_worthy),
  );
  // If something qualifies for Bluesky, it also qualifies for Discord
  const isDiscordRecommended =
    (result.recommended_channels?.includes("discord") ?? false) ||
    hasBlueskyDrafts ||
    hasBlueskyWorthy;

  const recommendedChannels = isDiscordRecommended
    ? Array.from(new Set([...(result.recommended_channels ?? []), "discord"]))
    : result.recommended_channels;

  const discordCopy =
    isDiscordRecommended && hasBlueskyDrafts
      ? deriveDiscordFromBluesky(drafts.bluesky.map((post) => post.text))
      : undefined;

  return { recommendedChannels, discordCopy };
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
  fetchPromotionCommits(previousSha, newSha);
  const delta = gatherDelta(previousSha, newSha);
  const publicContent = findPublicContent(previousSha, newSha);
  const resumable = state.history.find(
    (entry) =>
      entry.sha === newSha && entry.completed === false && entry.drafts,
  );
  const result: EvaluatorResult = resumable
    ? {
        postworthy: resumable.postworthy,
        importance: resumable.importance as
          "low" | "medium" | "high" | undefined,
        features: resumable.features,
        recommended_channels: resumable.recommendedChannels,
        reason: resumable.reason,
      }
    : await runJsonAgentPass(
        buildEvaluatorPrompt({
          previousSha,
          newSha,
          ...delta,
          publicContent,
          recentDiscussionTitles: fetchRecentDiscussionTitles(),
          recentBlueskyTitles: fetchRecentBlueskyTitles(),
        }),
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

  const resumableDrafts =
    resumable?.drafts &&
    findOversizedBlueskyDrafts(resumable.drafts).length === 0
      ? resumable.drafts
      : undefined;
  const drafts: WriterResult | null =
    resumableDrafts ??
    (result.postworthy
      ? await runWriterPassWithBudgetRetries(
          result,
          publicContent,
          logPath,
          promoteRunId,
        )
      : null);
  if (result.postworthy && !drafts) {
    console.error(
      `[release-comms] writer produced no usable drafts; see ${logPath}`,
    );
  } else if (drafts) {
    const discordConfig = loadDiscordConfig(REPOSITORY_ROOT);
    const { recommendedChannels, discordCopy } = deriveDiscordQualification(
      result,
      drafts,
    );
    result.recommended_channels = recommendedChannels;
    if (discordConfig.enabled && discordCopy !== undefined) {
      drafts.discord = discordCopy;
    }
  }

  let entry: ReleaseCommsHistoryEntry = {
    sha: newSha,
    date: new Date().toISOString(),
    promoteRunId,
    postworthy: result.postworthy,
    importance: result.importance,
    features: result.features,
    recommendedChannels: result.recommended_channels,
    reason: result.reason,
    drafts: drafts ?? undefined,
    publications: resumable?.publications ?? {
      bluesky: [],
      githubDiscussions: [],
    },
    completed: false,
  };
  await saveReleaseCommsState(recordEvaluation(state, entry));

  const newlyPublishedBluesky: Array<{ pageUrl: string; url: string }> = [];
  if (drafts) {
    const publishedBluesky = entry.publications?.bluesky ?? [];
    for (const draft of drafts.bluesky.filter(
      (draft) =>
        !publishedBluesky.some(
          (publication) => publication.pageUrl === draft.pageUrl,
        ),
    )) {
      const publication = publishBlueskyPost(
        draft.text,
        await resolveSocialAsset(publicPageFor(publicContent, draft.pageUrl)),
      );
      console.log(`[release-comms] published Bluesky post: ${publication.url}`);
      entry = {
        ...entry,
        publications: {
          ...entry.publications!,
          bluesky: [
            ...publishedBluesky,
            { pageUrl: draft.pageUrl, url: publication.url },
          ],
        },
      };
      publishedBluesky.push({ pageUrl: draft.pageUrl, url: publication.url });
      newlyPublishedBluesky.push({
        pageUrl: draft.pageUrl,
        url: publication.url,
      });
      await saveReleaseCommsState(recordEvaluation(state, entry));
    }
    const publishedDiscussions = entry.publications?.githubDiscussions ?? [];
    for (const draft of drafts.github_discussions.filter(
      (draft) =>
        !publishedDiscussions.some(
          (publication) => publication.pageUrl === draft.pageUrl,
        ),
    )) {
      const publication = publishDiscussion(
        draft.title,
        draft.body,
        await resolveSocialAsset(publicPageFor(publicContent, draft.pageUrl)),
      );
      console.log(
        `[release-comms] published GitHub Discussion: ${publication.url}`,
      );
      entry = {
        ...entry,
        publications: {
          ...entry.publications!,
          githubDiscussions: [
            ...publishedDiscussions,
            { pageUrl: draft.pageUrl, url: publication.url },
          ],
        },
      };
      publishedDiscussions.push({
        pageUrl: draft.pageUrl,
        url: publication.url,
      });
      await saveReleaseCommsState(recordEvaluation(state, entry));
    }
  }
  // Auto-publish to configured Discord destinations if enabled. This runs
  // before the entry is marked completed: if the webhook fails, completed
  // stays false so the next invocation resumes and retries delivery instead
  // of silently skipping this SHA forever (state.lastEvaluatedSha only
  // advances once completed is true, see recordEvaluation).
  let discordPublishFailed = false;
  if (result.postworthy && drafts?.discord && !entry.publications?.discord) {
    const discordConfig = loadDiscordConfig(REPOSITORY_ROOT);
    if (discordConfig.enabled) {
      const autoPublishDestinations = discordConfig.destinations.filter(
        (dest) => dest.auto_publish,
      );
      if (autoPublishDestinations.length > 0) {
        let allSucceeded = true;
        for (const dest of autoPublishDestinations) {
          const pubResult = await publishToDiscord({
            message: drafts.discord,
            destination: dest,
            dryRun: isReleaseCommsDryRun(),
          });
          if (pubResult.success) {
            console.log(
              `[release-comms] published announcement to Discord destination '${dest.id}'`,
            );
          } else {
            allSucceeded = false;
            console.error(
              `[release-comms] failed to publish to Discord destination '${dest.id}': ${pubResult.error}`,
            );
          }
        }

        if (allSucceeded) {
          entry = {
            ...entry,
            publications: { ...entry.publications!, discord: true },
          };
        } else {
          discordPublishFailed = true;
        }
      }
    }
  }

  entry = { ...entry, completed: !discordPublishFailed };
  await saveReleaseCommsState(recordEvaluation(state, entry));

  if (isReleaseCommsDryRun()) {
    console.log("[release-comms] dry run: skipped tracking issue comment");
    return;
  }

  // A tracker row must exist before any later updateTrackerPlatformStatus
  // call can tick a platform cell for this release.
  if (newlyPublishedBluesky.length > 0) {
    const shortSha = newSha.slice(0, 7);
    const trackerRowResult = await insertTrackerRow(
      {
        date: entry.date.slice(0, 10),
        topic: `Release comms auto-draft (\`${shortSha}\`)`,
        reference: newlyPublishedBluesky.map((post) => post.url).join(", "),
        platforms: {
          bluesky: true,
          discord: false,
          instagram: false,
          patreon: false,
        },
      },
      REPOSITORY_ROOT,
    );
    if (!trackerRowResult.success) {
      console.error(
        `[release-comms] could not insert tracker row: ${trackerRowResult.error}`,
      );
    }
  }

  if (entry.publications?.discord) {
    const trackerResult = await updateTrackerPlatformStatus(
      newSha.slice(0, 7),
      "Discord",
      true,
      REPOSITORY_ROOT,
    );
    if (!trackerResult.success) {
      console.error(
        `[release-comms] could not update Discord tracker status: ${trackerResult.error}`,
      );
    }
  }

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
