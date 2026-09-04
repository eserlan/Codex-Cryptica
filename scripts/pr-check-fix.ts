import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import {
  AGENT_PROVIDERS,
  resolveAgentExecutable,
  resetWorktree,
  type AgentProviderName,
} from "./auto-degodify.ts";

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
  baseRefName: string;
  url: string;
  state: string;
  mergeable: string;
}

export interface PrFeedback {
  prMeta: PrMetadata;
  unresolvedComments: PrReviewComment[];
  failingChecks: PrCheck[];
  reviews: PrReview[];
  hasActionableFeedback: boolean;
}

export interface PrFixOptions {
  rootDir?: string;
  prNumber: number;
  workdir?: string;
  branchName?: string;
  baseBranch?: string;
  agentProviders?: AgentProviderName[];
  timeoutMinutes?: number;
  waitMinutesForReview?: number;
  maxRounds?: number;
  worktreePath?: string;
  dryRun?: boolean;
}

/**
 * Get GitHub repository slug (owner/repo).
 */
export function getRepoSlug(repoDir: string): string {
  try {
    const slug = execSync("gh repo view --json nameWithOwner -q .nameWithOwner", {
      cwd: repoDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
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
    `gh pr view ${prNumber} --json number,title,headRefName,baseRefName,url,state,mergeable`,
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
    const reviewsRaw = execSync(
      `gh pr view ${prNumber} --json reviews`,
      { cwd: repoDir, encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] },
    );
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
            (r.body && r.body.length > 50 && r.author?.login.includes("copilot")),
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
  try {
    const checksRaw = execSync(
      `gh pr checks ${prNumber} --json name,state,bucket,link,workflow`,
      { cwd: repoDir, encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] },
    );
    const allChecks = JSON.parse(checksRaw) as PrCheck[];
    failingChecks = allChecks.filter(
      (c) => c.bucket === "fail" || c.state === "FAILURE",
    );
  } catch {
    // ignore
  }

  const hasActionableFeedback =
    unresolvedComments.length > 0 ||
    failingChecks.length > 0 ||
    reviews.some((r) => r.state === "CHANGES_REQUESTED");

  return {
    prMeta,
    unresolvedComments,
    failingChecks,
    reviews,
    hasActionableFeedback,
  };
}

/**
 * Poll periodically for feedback to arrive (e.g. waiting for Copilot / CI checks).
 */
export async function pollForPrFeedback(
  prNumber: number,
  repoDir: string,
  waitMinutes: number,
): Promise<PrFeedback> {
  const maxAttempts = Math.max(1, Math.floor((waitMinutes * 60) / 20));
  console.log(
    `⏳ Checking for PR #${prNumber} reviews and check results (polling up to ${waitMinutes}m)...`,
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const feedback = fetchPrFeedback(prNumber, repoDir);
    if (feedback.hasActionableFeedback) {
      console.log(
        `📬 Detected actionable feedback on PR #${prNumber}: ` +
          `${feedback.unresolvedComments.length} comment(s), ` +
          `${feedback.failingChecks.length} failing check(s).`,
      );
      return feedback;
    }

    if (attempt < maxAttempts) {
      await new Promise((res) => setTimeout(res, 20_000));
    }
  }

  // Final check
  return fetchPrFeedback(prNumber, repoDir);
}

/**
 * Construct structured prompt for the agent to fix PR review feedback and check failures.
 */
export function buildPrFixPrompt(
  feedback: PrFeedback,
  branchName: string,
  baseBranch: string,
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
              `${i + 1}. **${c.name}** (${c.workflow || "CI"}): state=${c.state}, link=${c.link}`,
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
   - Ensure all affected tests pass: \`bun test <test-file>\`.
3. QUALITY GATES:
   - Run typecheck: \`bun run lint:types\` (must pass with 0 errors).
   - Run linter: \`bun run lint\` (must pass with 0 errors).
4. COMMIT AND PUSH:
   - When verified:
     - Stage only modified/added files.
     - Commit with gitmoji message:
       \`♻️ refactor: address PR #${prMeta.number} review comments and check failures\`
     - Push to remote branch:
       \`git push origin ${branchName} --no-verify\`
   - Do NOT close the PR.`;
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
  const waitMinutes = options.waitMinutesForReview ?? 2;
  const maxRounds = options.maxRounds ?? 2;
  const providers = options.agentProviders || ["claude", "codex", "agy"];

  console.log(`\n🔍 Checking feedback for PR #${prNumber}...`);
  const feedback = await pollForPrFeedback(prNumber, rootDir, waitMinutes);

  if (!feedback.hasActionableFeedback) {
    console.log(
      `🎉 PR #${prNumber} has no actionable review comments or failing checks. All clear!`,
    );
    return true;
  }

  const branchName = options.branchName || feedback.prMeta.headRefName;
  const baseBranch = options.baseBranch || feedback.prMeta.baseRefName;

  console.log(
    `\n🛠️ PR #${prNumber} has ${feedback.unresolvedComments.length} comment(s) and ${feedback.failingChecks.length} failing check(s).`,
  );

  const prompt = buildPrFixPrompt(feedback, branchName, baseBranch);

  if (options.dryRun) {
    console.log("\n[DRY RUN] Fix prompt that would be sent to agent:\n");
    console.log(prompt);
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

    execSync(`git fetch origin ${branchName}`, {
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
    for (let round = 1; round <= maxRounds; round++) {
      console.log(`\n🚀 [Round ${round}/${maxRounds}] Running agent fix pass...`);

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

        const result = spawnSync(binPath, args, {
          cwd: worktreePath,
          stdio: "inherit",
          env: { ...process.env, HUSKY: "0" },
          timeout: timeoutMinutes * 60 * 1000,
        });

        if (result.status === 0) {
          console.log(`✅ ${providerName} completed successfully.`);
          passSucceeded = true;
          break;
        }

        console.warn(`⚠️ ${providerName} exited with code ${result.status}.`);

        const nextProvider = providers[i + 1];
        if (nextProvider) {
          console.log(`🔄 Resetting worktree and falling back to ${nextProvider}...`);
          resetWorktree(worktreePath, branchName, branchName);
        }
      }

      if (passSucceeded) {
        console.log(`\n🎉 Fix round ${round} complete.`);
        break;
      }
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

  return true;
}

// Direct CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  const prArg = args.find((a) => !a.startsWith("-"));
  const dryRun = args.includes("--dry-run");

  if (!prArg) {
    console.error("Usage: bun scripts/pr-check-fix.ts <pr-number> [--dry-run]");
    process.exit(1);
  }

  const prNumber = parseInt(prArg, 10);
  if (isNaN(prNumber)) {
    console.error(`Invalid PR number: ${prArg}`);
    process.exit(1);
  }

  runPrFixLoop({ prNumber, dryRun }).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
