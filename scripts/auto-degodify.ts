import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { homedir } from "node:os";
import { runGodFileAnalysis, type FileAnalysis } from "./god-file-analysis.ts";

export interface AutoDegodifyOptions {
  rootDir?: string;
  targetFile?: string;
  dryRun?: boolean;
  workdir?: string;
  agentBin?: string;
  baseBranch?: string;
  timeoutMinutes?: number;
}

export interface CandidateSelection {
  candidate: FileAnalysis | null;
  skipped: Array<{ file: FileAnalysis; reason: string }>;
}

/**
 * Fetch open PRs and remote branches to avoid collisions with active refactoring branches.
 */
export function getActiveBranchesAndPrs(repoDir: string): string[] {
  const activeItems: string[] = [];
  try {
    const prOutput = execSync(
      "gh pr list --state open --json title,headRefName",
      {
        cwd: repoDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      },
    );
    const prs = JSON.parse(prOutput) as Array<{
      title?: string;
      headRefName?: string;
    }>;
    for (const pr of prs) {
      if (pr.title) activeItems.push(pr.title.toLowerCase());
      if (pr.headRefName) activeItems.push(pr.headRefName.toLowerCase());
    }
  } catch {
    // gh may not be logged in or available in test environment
  }

  try {
    const branchOutput = execSync("git branch -r", {
      cwd: repoDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const branches = branchOutput
      .split("\n")
      .map((b) => b.trim().toLowerCase());
    activeItems.push(...branches);
  } catch {
    // git command failed or not in repo
  }

  return activeItems;
}

/**
 * Select the highest priority file to decompose, skipping files already being worked on.
 */
export function selectDegodifyCandidate(
  files: FileAnalysis[],
  activeItems: string[],
): CandidateSelection {
  const skipped: Array<{ file: FileAnalysis; reason: string }> = [];

  for (const file of files) {
    if (file.isDataCatalog) {
      continue;
    }

    if (file.status === "STABLE") {
      continue;
    }

    const base = basename(file.relativePath).toLowerCase();
    const baseWithoutExt = base.replace(/\.(svelte|ts|js)$/, "");

    // Check if any open PR or branch references this file
    const hasConflict = activeItems.some(
      (item) => item.includes(base) || item.includes(baseWithoutExt),
    );

    if (hasConflict) {
      skipped.push({
        file,
        reason: `Active branch or open PR already targets ${base}`,
      });
      continue;
    }

    return { candidate: file, skipped };
  }

  return { candidate: null, skipped };
}

/**
 * Build the prompt instructing agy to decompose the file safely under Constitution XIV.
 */
export function buildDecompositionPrompt(
  file: FileAnalysis,
  branchName: string,
  baseBranch: string,
): string {
  const fileBasename = basename(file.relativePath);

  return `You are Curator, an autonomous refactoring specialist executing Constitution Principle XIV (Bounded Responsibility: No God Files) on Codex-Cryptica.

TARGET FILE: ${file.relativePath} (Current size: ${file.totalLines} lines, ${file.codeLines} code lines, type: ${file.type})
CURRENT BRANCH: ${branchName} (branched from ${baseBranch})

MISSION:
Perform a surgical, bounded decomposition on ${file.relativePath}.
Extract ONE single cohesive responsibility, helper function, sub-component, or handler cluster out of this god file into a dedicated sibling file.

STRICT CONSTRAINTS (Constitution Principles I, II, XIV):
1. SURGICAL EXTRACTION ONLY:
   - Do NOT attempt to refactor the entire file.
   - Extract only ONE focused unit (e.g. an extracted sub-component, a state controller, an isolated parser/builder, or a set of pure calculations).
   - Create a clean sibling file (e.g. alongside ${file.relativePath}) for the extracted logic.
   - Re-import and wire the extracted unit back into ${file.relativePath} with zero regression to external API or behavior.
2. PRESERVE COMPONENT PATTERNS:
   - If Svelte 5: Strictly use runes ($state, $derived, $props). Never initialize $state directly from props.
   - Icons: ALWAYS use Iconify class pattern \`icon-[lucide--*]\`, NEVER \`lucide-svelte\`.
   - Dependency Injection: Use constructor-based DI for stores/services.
3. MANDATORY TESTING (Principle II):
   - Every extracted function or component MUST have unit tests in a sibling test file (e.g. \`*.test.ts\`).
   - Cover the expected success path and at least one negative/edge path.
4. QUALITY GATE VERIFICATION:
   - Run \`bun test <your-new-test-file>\` to ensure tests pass.
   - Run \`bun run lint:types\` to ensure 0 type errors.
   - Run \`bun run lint\` to ensure 0 lint errors.
5. COMMIT AND PULL REQUEST:
   - When all tests and lints pass with 0 errors:
     - Stage ONLY the files you modified or created.
     - Commit with gitmoji message:
       \`🗂️ Curator: [degodify] extract <concern> from ${fileBasename}\`
     - Push the branch to origin:
       \`git push -u origin ${branchName}\`
     - Create a ready-for-review Pull Request:
       \`gh pr create --base ${baseBranch} --title "🗂️ Curator: [degodify] extract <concern> from ${fileBasename}" --body "..."\`
   - If verification fails and cannot be fixed, revert your changes and exit without pushing.`;
}

/**
 * Main automated degodify controller.
 */
export async function autoDegodify(options: AutoDegodifyOptions = {}) {
  const rootDir = options.rootDir || process.cwd();
  const baseBranch = options.baseBranch || "staging";
  const agentBin = options.agentBin || "agy";
  const timeoutMinutes = options.timeoutMinutes ?? 25;
  const workdirBase =
    options.workdir || resolve(homedir(), ".cache/codex-degodify");

  console.log(
    "🔍 Evaluating god files for automated decomposition candidate...",
  );
  const report = await runGodFileAnalysis({ rootDir, topCount: 50 });

  let targetCandidate: FileAnalysis | null;

  if (options.targetFile) {
    targetCandidate =
      report.topFiles.find(
        (f) =>
          f.relativePath === options.targetFile ||
          f.path === options.targetFile,
      ) || null;
    if (!targetCandidate) {
      console.error(`Target file ${options.targetFile} not found in analysis.`);
      return false;
    }
  } else {
    const activeItems = getActiveBranchesAndPrs(rootDir);
    const selection = selectDegodifyCandidate(report.topFiles, activeItems);

    for (const skip of selection.skipped) {
      console.log(`⏩ Skipping ${skip.file.relativePath}: ${skip.reason}`);
    }

    targetCandidate = selection.candidate;
  }

  if (!targetCandidate) {
    console.log(
      "🎉 No eligible god files found that need decomposition (or all are in active review)!",
    );
    return true;
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 14);
  const fileSlug = basename(targetCandidate.relativePath)
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();
  const branchName = `curator/degod-${fileSlug}-${timestamp}`;

  console.log(`\n🎯 Selected target for degodification:`);
  console.log(`   File:   ${targetCandidate.relativePath}`);
  console.log(
    `   Lines:  ${targetCandidate.totalLines} (${targetCandidate.codeLines} code lines)`,
  );
  console.log(`   Layer:  ${targetCandidate.type}`);
  console.log(`   Branch: ${branchName}`);

  const prompt = buildDecompositionPrompt(
    targetCandidate,
    branchName,
    baseBranch,
  );

  if (options.dryRun) {
    console.log("\n[DRY RUN] Prompt that would be sent to AI agent:\n");
    console.log(prompt);
    return true;
  }

  // Setup isolated worktree
  const worktreePath = resolve(workdirBase, `worktree-${timestamp}`);
  await mkdir(workdirBase, { recursive: true });

  console.log(`\n📦 Creating isolated git worktree at ${worktreePath}...`);
  try {
    execSync(`git fetch origin ${baseBranch}`, {
      cwd: rootDir,
      stdio: "inherit",
    });
    execSync(
      `git worktree add -b ${branchName} ${worktreePath} origin/${baseBranch}`,
      {
        cwd: rootDir,
        stdio: "inherit",
      },
    );

    console.log(`🤖 Launching ${agentBin} in isolated worktree...`);
    const agyResult = spawnSync(
      agentBin,
      [
        "--print",
        prompt,
        "--dangerously-skip-permissions",
        `--print-timeout=${timeoutMinutes}m0s`,
      ],
      {
        cwd: worktreePath,
        stdio: "inherit",
        env: { ...process.env, HUSKY: "0" },
      },
    );

    if (agyResult.error) {
      throw agyResult.error;
    }

    console.log("✅ AI agent run finished.");
  } catch (err) {
    console.error("❌ Degodification run encountered an error:", err);
  } finally {
    console.log("🧹 Cleaning up isolated worktree...");
    try {
      if (existsSync(worktreePath)) {
        execSync(`git worktree remove --force ${worktreePath}`, {
          cwd: rootDir,
          stdio: "ignore",
        });
      }
      await rm(worktreePath, { recursive: true, force: true });
    } catch {
      // Ignore worktree cleanup failure
    }
  }

  return true;
}

// Direct CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const targetIdx = args.indexOf("--target");
  const targetFile = targetIdx !== -1 ? args[targetIdx + 1] : undefined;

  autoDegodify({ dryRun, targetFile }).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
