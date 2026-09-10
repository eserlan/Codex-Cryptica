import { execSync, spawn } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import {
  AGENT_PROVIDERS,
  resolveAgentExecutable,
  resetWorktree,
  type AgentProviderName,
} from "./auto-degodify.ts";
import {
  buildConflictResolutionInstructions,
  getUnmergedPaths,
  isWorktreePushed,
  mergeStagingIntoWorktree,
} from "./pr-worktree-merge.ts";

export interface PrReviewComment {
  id: number;
  path: string;
  line: number | null;
  body: string;
  author: string;
  inReplyToId?: number;
}

export interface PrCheck {
  name: string;
  state: string;
  bucket: string;
  link: string;
  workflow?: string;
  failureDetails?: string;
}

export interface PrReview {
  id: string;
  state: string;
  author: string;
  body: string;
}

export interface PrMetadata {
  number: number;
  title: string;
  headRefName: string;
  headRefOid: string;
  baseRefName: string;
  url: string;
  state: string;
  mergeable: string;
  mergeStateStatus?: string;
  reviewDecision?: string | null;
  isDraft?: boolean;
}

export interface PrFeedback {
  prMeta: PrMetadata;
  unresolvedComments: PrReviewComment[];
  failingChecks: PrCheck[];
  pendingChecks: PrCheck[];
  reviews: PrReview[];
  hasActionableFeedback: boolean;
}

export interface PollFeedbackOptions {
  initialWaitMinutes?: number;
  pollIntervalSeconds?: number;
  maxWaitMinutes?: number;
}

export interface PrFixOptions {
  rootDir?: string;
  prNumber: number;
  workdir?: string;
  branchName?: string;
  baseBranch?: string;
  agentProviders?: AgentProviderName[];
  timeoutMinutes?: number;
  initialWaitMinutes?: number;
  pollIntervalSeconds?: number;
  maxWaitMinutes?: number;
  waitMinutesForReview?: number;
  maxRounds?: number;
  worktreePath?: string;
  logDir?: string;
  /** Review a settled PR even when GitHub has supplied no actionable feedback. */
  reviewIfClear?: boolean;
  dryRun?: boolean;
}

export interface AgentRunResult {
  status: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
}

/** Return the durable log path for one PR fixer run. */
export function getPrFixLogPath(
  prNumber: number,
  runId: string,
  logDir = resolve(homedir(), ".local/state/codex-pr-review"),
): string {
  const safeRunId = runId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return resolve(logDir, `pr-${prNumber}-${safeRunId}.log`);
}

/**
 * Run an agent while forwarding its output to the journal and a durable file.
 * The async implementation also lets us emit heartbeats during long checks.
 */
export async function runAgentWithLogging(
  binPath: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    timeoutMs: number;
    logPath: string;
    runId: string;
  },
): Promise<AgentRunResult> {
  await mkdir(resolve(options.logPath, ".."), { recursive: true });
  const log = createWriteStream(options.logPath, { flags: "a" });
  const startedAt = new Date().toISOString();
  log.write(`\n=== agent started ${startedAt} (${options.runId}) ===\n`);
  console.log(`[pr-fix:${options.runId}] agent output: ${options.logPath}`);

  const child = spawn(binPath, args, {
    cwd: options.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: options.env,
  });

  let timedOut = false;
  let heartbeatSeconds = 0;
  const heartbeat = setInterval(() => {
    heartbeatSeconds += 30;
    const message = `[pr-fix:${options.runId}] agent still running (${heartbeatSeconds}s elapsed)`;
    console.log(message);
    log.write(`${message}\n`);
  }, 30_000);

  const forward = (stream: NodeJS.ReadableStream | null, label: string) => {
    stream?.on("data", (chunk: Buffer | string) => {
      const output = chunk.toString();
      log.write(`[${label}] ${output}`);
      process.stdout.write(`[agent:${label}] ${output}`);
    });
  };
  forward(child.stdout, "stdout");
  forward(child.stderr, "stderr");

  const result = await new Promise<AgentRunResult>((resolveResult) => {
    const timeout = setTimeout(() => {
      timedOut = true;
      const message = `[pr-fix:${options.runId}] timeout reached; terminating agent`;
      console.error(message);
      log.write(`${message}\n`);
      child.kill("SIGTERM");
    }, options.timeoutMs);

    child.once("error", (error) => {
      clearTimeout(timeout);
      resolveResult({ status: null, signal: null, timedOut });
      console.error(
        `[pr-fix:${options.runId}] agent process error: ${error.message}`,
      );
    });
    child.once("close", (status, signal) => {
      clearTimeout(timeout);
      resolveResult({ status, signal, timedOut });
    });
  });

  clearInterval(heartbeat);
  log.write(
    `=== agent finished ${new Date().toISOString()} status=${result.status ?? "null"} signal=${result.signal ?? "none"} timedOut=${result.timedOut} ===\n`,
  );
  await new Promise<void>((resolveLog) => log.end(resolveLog));
  return result;
}

/**
 * Get GitHub repository slug (owner/repo).
 */
export function getRepoSlug(repoDir: string): string {
  try {
    const slug = execSync(
      "gh repo view --json nameWithOwner -q .nameWithOwner",
      {
        cwd: repoDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      },
    ).trim();
    if (slug) return slug;
  } catch {
    // fallback
  }
  return "eserlan/Codex-Cryptica";
}

/**
 * Fetch PR metadata, review comments, reviews, and check statuses from GitHub.
 */
export function fetchPrFeedback(prNumber: number, repoDir: string): PrFeedback {
  const repoSlug = getRepoSlug(repoDir);

  const prMetaRaw = execSync(
    `gh pr view ${prNumber} --json number,title,headRefName,headRefOid,baseRefName,url,state,mergeable,mergeStateStatus,reviewDecision,isDraft`,
    { cwd: repoDir, encoding: "utf-8" },
  );
  const prMeta = JSON.parse(prMetaRaw) as PrMetadata;

  // 1. Fetch inline review comments
  let allComments: Array<{
    id: number;
    path: string;
    line?: number | null;
    original_line?: number | null;
    body: string;
    in_reply_to_id?: number;
    user?: { login: string };
  }> = [];

  try {
    const commentsRaw = execSync(
      `gh api repos/${repoSlug}/pulls/${prNumber}/comments`,
      { cwd: repoDir, encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] },
    );
    allComments = JSON.parse(commentsRaw);
  } catch {
    // ignore
  }

  // Filter out comments that have already been replied to
  const replyIds = new Set(
    allComments
      .filter((c) => c.in_reply_to_id)
      .map((c) => c.in_reply_to_id as number),
  );

  const unresolvedComments: PrReviewComment[] = allComments
    .filter((c) => !c.in_reply_to_id && !replyIds.has(c.id))
    .map((c) => ({
      id: c.id,
      path: c.path,
      line: c.line ?? c.original_line ?? null,
      body: c.body,
      author: c.user?.login || "unknown",
      inReplyToId: c.in_reply_to_id,
    }));

  // 2. Fetch top-level reviews
  let reviews: PrReview[] = [];
  try {
    const reviewsRaw = execSync(`gh pr view ${prNumber} --json reviews`, {
      cwd: repoDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const parsed = JSON.parse(reviewsRaw) as {
      reviews?: Array<{
        id: string;
        state: string;
        body: string;
        author?: { login: string };
      }>;
    };
    if (parsed.reviews) {
      reviews = parsed.reviews
        .filter(
          (r) =>
            r.state === "CHANGES_REQUESTED" ||
            (r.body &&
              r.body.length > 50 &&
              r.author?.login.includes("copilot")),
        )
        .map((r) => ({
          id: r.id,
          state: r.state,
          author: r.author?.login || "reviewer",
          body: r.body,
        }));
    }
  } catch {
    // ignore
  }

  // 3. Fetch check statuses
  let failingChecks: PrCheck[] = [];
  let pendingChecks: PrCheck[] = [];
  try {
    const checksRaw = execSync(
      `gh pr checks ${prNumber} --json name,state,bucket,link,workflow`,
      { cwd: repoDir, encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] },
    );
    const allChecks = JSON.parse(checksRaw) as PrCheck[];
    failingChecks = allChecks
      .filter((c) => c.bucket === "fail" || c.state === "FAILURE")
      .map((check) => ({
        ...check,
        failureDetails: fetchFailedCheckLog(check, repoDir),
      }));
    pendingChecks = allChecks.filter(
      (c) =>
        c.bucket === "pending" ||
        c.state === "PENDING" ||
        c.state === "IN_PROGRESS" ||
        c.state === "QUEUED",
    );
  } catch {
    // ignore
  }

  const hasActionableFeedback =
    unresolvedComments.length > 0 ||
    failingChecks.length > 0 ||
    reviews.some((r) => r.state === "CHANGES_REQUESTED") ||
    prMeta.mergeable === "CONFLICTING" ||
    prMeta.mergeStateStatus === "DIRTY";

  return {
    prMeta,
    unresolvedComments,
    failingChecks,
    pendingChecks,
    reviews,
    hasActionableFeedback,
  };
}

/** Fetch a bounded failed-job excerpt when a GitHub Actions run is available. */
export function fetchFailedCheckLog(
  check: PrCheck,
  repoDir: string,
): string | undefined {
  const runId = check.link.match(/\/actions\/runs\/(\d+)/)?.[1];
  if (!runId) return undefined;
  try {
    const output = execSync(`gh run view ${runId} --log-failed`, {
      cwd: repoDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    if (!output) return undefined;
    return output.slice(-12_000);
  } catch {
    return undefined;
  }
}

/**
 * Poll periodically for feedback to arrive (initial wait + 1-minute review loop).
 */
export async function pollForPrFeedback(
  prNumber: number,
  repoDir: string,
  options: PollFeedbackOptions | number = {},
): Promise<PrFeedback> {
  const opts: PollFeedbackOptions =
    typeof options === "number" ? { initialWaitMinutes: options } : options;

  const initialWaitMinutes = opts.initialWaitMinutes ?? 4;
  const pollIntervalSeconds = opts.pollIntervalSeconds ?? 60;
  const maxWaitMinutes = opts.maxWaitMinutes ?? 12;

  // 1. Immediate check: if feedback is already actionable, return immediately
  let feedback = fetchPrFeedback(prNumber, repoDir);
  if (feedback.hasActionableFeedback) {
    console.log(
      `📬 Detected actionable feedback on PR #${prNumber}: ` +
        `${feedback.unresolvedComments.length} comment(s), ` +
        `${feedback.failingChecks.length} failing check(s).`,
    );
    return feedback;
  }

  // If review already arrived with no requested changes and all CI checks completed
  if (feedback.reviews.length > 0 && feedback.pendingChecks.length === 0) {
    console.log(
      `✅ PR #${prNumber} already has completed review with no issues, and all checks finished.`,
    );
    return feedback;
  }

  const startTime = Date.now();
  const initialWaitMs = initialWaitMinutes * 60 * 1000;
  const maxWaitMs = maxWaitMinutes * 60 * 1000;

  console.log(
    `⏳ Waiting initial ${initialWaitMinutes}m for PR #${prNumber} CI runs and bot reviews...`,
  );

  // Initial wait phase: check every 20s during the first initialWaitMinutes
  while (Date.now() - startTime < initialWaitMs) {
    const remainingInitialMs = initialWaitMs - (Date.now() - startTime);
    const sleepMs = Math.min(20_000, remainingInitialMs);
    if (sleepMs > 0) {
      await new Promise((res) => setTimeout(res, sleepMs));
    }

    feedback = fetchPrFeedback(prNumber, repoDir);
    if (feedback.hasActionableFeedback) {
      console.log(
        `📬 Detected actionable feedback on PR #${prNumber} at ${Math.round((Date.now() - startTime) / 1000)}s: ` +
          `${feedback.unresolvedComments.length} comment(s), ` +
          `${feedback.failingChecks.length} failing check(s).`,
      );
      return feedback;
    }

    if (feedback.reviews.length > 0 && feedback.pendingChecks.length === 0) {
      console.log(
        `✅ Review landed on PR #${prNumber} with no requested changes, and all CI checks passed.`,
      );
      return feedback;
    }
  }

  console.log(
    `\n🔄 Reached ${initialWaitMinutes}m mark. Starting review loop (checking every ${pollIntervalSeconds}s up to ${maxWaitMinutes}m total)...`,
  );

  // Extended review loop phase: check every pollIntervalSeconds (e.g. 60s / 1 min)
  while (Date.now() - startTime < maxWaitMs) {
    feedback = fetchPrFeedback(prNumber, repoDir);
    if (feedback.hasActionableFeedback) {
      console.log(
        `📬 Detected actionable feedback on PR #${prNumber}: ` +
          `${feedback.unresolvedComments.length} comment(s), ` +
          `${feedback.failingChecks.length} failing check(s).`,
      );
      return feedback;
    }

    if (feedback.reviews.length > 0 && feedback.pendingChecks.length === 0) {
      console.log(
        `✅ Review landed on PR #${prNumber} with no requested changes, and all CI checks passed.`,
      );
      return feedback;
    }

    const elapsedMinutes = Math.round((Date.now() - startTime) / 60_000);
    console.log(
      `⏳ [Minute ${elapsedMinutes}/${maxWaitMinutes}] No review yet on PR #${prNumber}. ` +
        `Checking again in ${pollIntervalSeconds}s... (${feedback.pendingChecks.length} check(s) still pending)`,
    );

    await new Promise((res) => setTimeout(res, pollIntervalSeconds * 1000));
  }

  console.log(
    `⏰ Reached maximum review wait window (${maxWaitMinutes}m). Concluding review loop.`,
  );
  return fetchPrFeedback(prNumber, repoDir);
}

/**
 * Construct structured prompt for the agent to fix PR review feedback and check failures.
 */
export function buildPrFixPrompt(
  feedback: PrFeedback,
  branchName: string,
  baseBranch: string,
  mergeConflictPaths: string[] = [],
): string {
  const { prMeta, unresolvedComments, failingChecks, reviews } = feedback;

  const commentsFormatted =
    unresolvedComments.length > 0
      ? unresolvedComments
          .map(
            (c, i) =>
              `### Comment ${i + 1} (by @${c.author} on ${c.path}:${c.line ?? "?"})\n` +
              `> ${c.body.split("\n").join("\n> ")}\n`,
          )
          .join("\n")
      : "_None_";

  const reviewsFormatted =
    reviews.length > 0
      ? reviews
          .map(
            (r, i) =>
              `### Review ${i + 1} (by @${r.author}, State: ${r.state})\n` +
              `${r.body}\n`,
          )
          .join("\n")
      : "_None_";

  const checksFormatted =
    failingChecks.length > 0
      ? failingChecks
          .map(
            (c, i) =>
              `${i + 1}. **${c.name}** (${c.workflow || "CI"}): state=${c.state}, link=${c.link}` +
              (c.failureDetails
                ? `\n\nFailed-job excerpt:\n\`\`\`text\n${c.failureDetails}\n\`\`\``
                : ""),
          )
          .join("\n")
      : "_None_";

  return `You are an expert engineer resolving review comments and CI check failures on Pull Request #${prMeta.number} ("${prMeta.title}").

PR BRANCH: ${branchName} (based on ${baseBranch})
URL: ${prMeta.url}

MISSION:
Address all actionable review comments and failing checks by making surgical, correct code fixes, updating unit tests, and verifying quality gates.

---
## ACTIONABLE REVIEW COMMENTS:
${commentsFormatted}

## GENERAL REVIEWS:
${reviewsFormatted}

## FAILING CI CHECKS:
${checksFormatted}
---

STRICT INSTRUCTIONS & CONSTRAINTS (Constitution Principles I, II, XIV):
1. SURGICAL FIXES:
   - Carefully address every specific issue noted in the comments (e.g. index clamping, table mode guards, early returns to avoid referential churn, boundary checks).
   - Do NOT rewrite unrelated logic.
2. MANDATORY TESTING (Principle II):
   - Add or update test cases covering every fix (especially invalid/out-of-bounds inputs or edge cases pointed out in the reviews).
   - Ensure all affected tests pass by running ONLY targeted test files: \`bun test <path/to/test-file>\` or \`bunx vitest run <path/to/test-file>\`.
   - NEVER run bare \`bun test\` across the monorepo root (apps/web requires Vitest and will hang or fail under bare bun test).
3. QUALITY GATES:
   - Run typecheck: \`bun run lint:types\` (must pass with 0 errors).
   - Run linter: \`bun run lint\` (must pass with 0 errors).
4. COMMIT AND PUSH:
   - When verified:
     - Stage only modified/added files.
     - Commit with gitmoji message:
       \`♻️ refactor: address PR #${prMeta.number} review comments and check failures\`
     - Push to remote branch:
       \`git push origin HEAD:${branchName} --no-verify\`
   - Reply to each addressed inline review comment with a concise summary of the fix.
   - Do NOT close the PR.
${mergeConflictPaths.length > 0 ? buildConflictResolutionInstructions(mergeConflictPaths) : ""}`;
}

/** Construct the pre-merge review-and-fix prompt used when GitHub has no review. */
export function buildInternalPrReviewPrompt(
  feedback: PrFeedback,
  branchName: string,
  baseBranch: string,
  mergeConflictPaths: string[] = [],
): string {
  return `You are the final pre-merge reviewer and fixer for Pull Request #${feedback.prMeta.number} ("${feedback.prMeta.title}").

PR BRANCH: ${branchName} (based on ${baseBranch})
URL: ${feedback.prMeta.url}

GitHub has no actionable review feedback and all current checks are green. Perform TWO independent review passes before deciding whether to change code:

1. GENERAL DEFECT REVIEW (your built-in reviewer): inspect the actual merge diff against \`origin/${baseBranch}\`, surrounding call sites, and relevant tests. Report only concrete regressions introduced by this PR that affect correctness, security, performance, or maintainability. Do not invent style nits or speculative findings.
2. CODEX-CRYPTICA REVIEW: read \`.codex/skills/codex-review/SKILL.md\`, then its linked extended review guidance. Apply the project's Svelte 5, TypeScript, worker-safety, async race, privacy, accessibility, DI, test, and bounded-responsibility checks to this diff.

If both passes find no actionable defect: check \`git rev-parse HEAD\` against the original PR head SHA (\`${feedback.prMeta.headRefOid}\`). If they match, make no changes and exit successfully. If HEAD has moved (e.g. a pre-merge \`git merge origin/${baseBranch}\` created a merge commit), you MUST still push that commit with \`git push origin HEAD:${branchName} --no-verify\` before exiting, even though there are no code changes to make — the merge commit needs to reach the PR branch. Do not create empty commits.

If either pass finds a concrete defect:
- Make the smallest correct fix; do not refactor unrelated code.
- Add or update focused tests for each changed behaviour, including a meaningful negative or failure case.
- Run the affected tests (e.g. \`bun test <file>\` or \`bunx vitest run <file>\`, NEVER bare \`bun test\`), \`bun run lint:types\`, and \`bun run lint\`.
- Stage only your changes, commit with a gitmoji message such as \`🐛 fix: address internal PR review findings\`, and push with \`git push origin HEAD:${branchName} --no-verify\`.
- Do not close or merge the PR. GitHub checks and the webhook will handle that after your push.
${mergeConflictPaths.length > 0 ? buildConflictResolutionInstructions(mergeConflictPaths) : ""}`;
}

/**
 * Post a reply to a specific review comment on GitHub.
 */
export function replyToPrComment(
  repoDir: string,
  prNumber: number,
  commentId: number,
  body: string,
): boolean {
  const repoSlug = getRepoSlug(repoDir);
  try {
    execSync(
      `gh api repos/${repoSlug}/pulls/${prNumber}/comments/${commentId}/replies -f body="${body.replace(/"/g, '\\"')}"`,
      { cwd: repoDir, stdio: "ignore" },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute the PR check & fix loop.
 */
export async function runPrFixLoop(options: PrFixOptions): Promise<boolean> {
  const rootDir = options.rootDir || process.cwd();
  const prNumber = options.prNumber;
  const timeoutMinutes = options.timeoutMinutes ?? 20;
  const maxRounds = options.maxRounds ?? 2;
  const providers = options.agentProviders || ["claude", "codex", "agy"];
  const runId = new Date()
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 14);
  const logPath = getPrFixLogPath(prNumber, runId, options.logDir);

  console.log(`\n🔍 Checking feedback for PR #${prNumber} (run ${runId})...`);
  console.log(`[pr-fix:${runId}] durable log: ${logPath}`);
  const feedback = options.reviewIfClear
    ? fetchPrFeedback(prNumber, rootDir)
    : await pollForPrFeedback(prNumber, rootDir, {
        initialWaitMinutes:
          options.initialWaitMinutes ?? options.waitMinutesForReview ?? 4,
        pollIntervalSeconds: options.pollIntervalSeconds ?? 60,
        maxWaitMinutes: options.maxWaitMinutes ?? 12,
      });

  if (!feedback.hasActionableFeedback && !options.reviewIfClear) {
    console.log(
      `🎉 PR #${prNumber} has no actionable review comments or failing checks. All clear!`,
    );
    return true;
  }

  const branchName = options.branchName || feedback.prMeta.headRefName;
  const baseBranch = options.baseBranch || feedback.prMeta.baseRefName;

  console.log(
    options.reviewIfClear
      ? `\n🔎 PR #${prNumber} is green with no GitHub feedback; starting internal two-pass review.`
      : `\n🛠️ PR #${prNumber} has ${feedback.unresolvedComments.length} comment(s) and ${feedback.failingChecks.length} failing check(s).`,
  );

  if (options.dryRun) {
    console.log("\n[DRY RUN] Fix prompt that would be sent to agent:\n");
    console.log(
      options.reviewIfClear
        ? buildInternalPrReviewPrompt(feedback, branchName, baseBranch)
        : buildPrFixPrompt(feedback, branchName, baseBranch),
    );
    return true;
  }

  // Determine worktree directory
  let worktreePath = options.worktreePath;
  let ownWorktree = false;

  if (!worktreePath || !existsSync(worktreePath)) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(0, 14);
    const workdirBase =
      options.workdir || resolve(homedir(), ".cache/codex-degodify");
    worktreePath = resolve(workdirBase, `pr-fix-${prNumber}-${timestamp}`);
    ownWorktree = true;

    await mkdir(workdirBase, { recursive: true });
    console.log(`📦 Creating isolated worktree at ${worktreePath}...`);

    execSync(`git fetch origin ${branchName} ${baseBranch}`, {
      cwd: rootDir,
      stdio: "inherit",
    });
    execSync(
      `git worktree add -b pr-fix-${prNumber}-${timestamp} ${worktreePath} origin/${branchName}`,
      {
        cwd: rootDir,
        stdio: "inherit",
      },
    );
  }

  try {
    let mergeResult = mergeStagingIntoWorktree(worktreePath, baseBranch);
    if (mergeResult.kind === "failed") {
      console.error(
        `[pr-fix:${runId}] could not merge staging: ${mergeResult.message}`,
      );
      return false;
    }
    let mergeConflictPaths =
      mergeResult.kind === "conflicted" ? mergeResult.paths : [];
    let prompt = options.reviewIfClear
      ? buildInternalPrReviewPrompt(
          feedback,
          branchName,
          baseBranch,
          mergeConflictPaths,
        )
      : buildPrFixPrompt(feedback, branchName, baseBranch, mergeConflictPaths);
    if (mergeConflictPaths.length > 0) {
      console.log(
        `[pr-fix:${runId}] staging merge has ${mergeConflictPaths.length} conflict(s); handing them to the agent.`,
      );
    }

    let fixSucceeded = false;
    for (let round = 1; round <= maxRounds; round++) {
      console.log(
        `\n🚀 [Round ${round}/${maxRounds}] Running agent fix pass...`,
      );

      let passSucceeded = false;

      for (let i = 0; i < providers.length; i++) {
        const providerName = providers[i];
        const binPath = resolveAgentExecutable(providerName);
        if (!binPath) continue;

        console.log(
          `🤖 [Provider ${i + 1}/${providers.length}] Launching ${providerName} (${binPath})...`,
        );

        const providerConfig = AGENT_PROVIDERS[providerName];
        const args = providerConfig
          ? providerConfig.getArgs(prompt, timeoutMinutes)
          : ["-p", prompt, "--dangerously-skip-permissions"];

        const result = await runAgentWithLogging(binPath, args, {
          cwd: worktreePath,
          env: { ...process.env, HUSKY: "0" },
          timeoutMs: timeoutMinutes * 60 * 1000,
          logPath,
          runId,
        });

        const unresolvedPaths = getUnmergedPaths(worktreePath);
        const pushed =
          result.status === 0 &&
          unresolvedPaths.length === 0 &&
          isWorktreePushed(worktreePath, branchName);
        const cleanNoFinding =
          options.reviewIfClear &&
          result.status === 0 &&
          unresolvedPaths.length === 0 &&
          !isWorktreePushed(worktreePath, branchName) &&
          execSync("git rev-parse HEAD", {
            cwd: worktreePath,
            encoding: "utf-8",
          }).trim() === feedback.prMeta.headRefOid;

        if (pushed || cleanNoFinding) {
          console.log(
            cleanNoFinding
              ? `✅ ${providerName} found no actionable internal review findings.`
              : `✅ ${providerName} completed successfully.`,
          );
          if (pushed && feedback.unresolvedComments.length > 0) {
            try {
              const newHeadSha = execSync("git rev-parse --short HEAD", {
                cwd: worktreePath,
                encoding: "utf-8",
              }).trim();
              // Re-fetch feedback so comments the agent already replied to
              // during this run aren't double-replied here.
              const refreshedFeedback = fetchPrFeedback(
                feedback.prMeta.number,
                worktreePath,
              );
              for (const comment of refreshedFeedback.unresolvedComments) {
                replyToPrComment(
                  worktreePath,
                  feedback.prMeta.number,
                  comment.id,
                  `Fixed in ${newHeadSha}: addressed review comment.`,
                );
              }
            } catch {
              // Best-effort comment replies
            }
          }
          passSucceeded = true;
          break;
        }

        if (result.status === 0 && unresolvedPaths.length > 0) {
          console.warn(
            `⚠️ ${providerName} left ${unresolvedPaths.length} merge conflict(s) behind.`,
          );
        } else if (result.status === 0) {
          console.warn(
            `⚠️ ${providerName} completed but did not push the resulting branch.`,
          );
        }

        console.warn(
          `⚠️ ${providerName} exited with code ${result.status ?? "null"}` +
            ` (signal: ${result.signal ?? "none"}, timed out: ${result.timedOut}).`,
        );

        const nextProvider = providers[i + 1];
        if (nextProvider) {
          console.log(
            `🔄 Resetting worktree and falling back to ${nextProvider}...`,
          );
          resetWorktree(worktreePath, branchName, branchName);
          mergeResult = mergeStagingIntoWorktree(worktreePath, baseBranch);
          if (mergeResult.kind === "failed") {
            console.error(
              `[pr-fix:${runId}] could not restore the staging merge for ${nextProvider}: ${mergeResult.message}`,
            );
            break;
          }
          mergeConflictPaths =
            mergeResult.kind === "conflicted" ? mergeResult.paths : [];
          prompt = options.reviewIfClear
            ? buildInternalPrReviewPrompt(
                feedback,
                branchName,
                baseBranch,
                mergeConflictPaths,
              )
            : buildPrFixPrompt(
                feedback,
                branchName,
                baseBranch,
                mergeConflictPaths,
              );
        }
      }

      if (passSucceeded) {
        console.log(`\n🎉 Fix round ${round} complete.`);
        fixSucceeded = true;
        break;
      }
    }

    if (!fixSucceeded) {
      console.error(
        `[pr-fix:${runId}] no provider completed a fix pass successfully.`,
      );
      return false;
    }
  } finally {
    if (ownWorktree && worktreePath && existsSync(worktreePath)) {
      console.log("🧹 Cleaning up isolated worktree...");
      try {
        execSync(`git worktree remove --force ${worktreePath}`, {
          cwd: rootDir,
          stdio: "ignore",
        });
        await rm(worktreePath, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }

  console.log(`[pr-fix:${runId}] run complete; detailed output: ${logPath}`);
  return true;
}

// Direct CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  const prArg = args.find((a) => !a.startsWith("-"));
  const dryRun = args.includes("--dry-run");
  const reviewIfClear = args.includes("--review-if-clear");

  if (!prArg) {
    console.error("Usage: bun scripts/pr-check-fix.ts <pr-number> [--dry-run]");
    process.exit(1);
  }

  const prNumber = parseInt(prArg, 10);
  if (isNaN(prNumber)) {
    console.error(`Invalid PR number: ${prArg}`);
    process.exit(1);
  }

  runPrFixLoop({ prNumber, dryRun, reviewIfClear }).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
