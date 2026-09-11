import { execFileSync, spawnSync } from "node:child_process";

export type StagingMergeResult =
  | { kind: "merged" }
  | { kind: "conflicted"; paths: string[] }
  | { kind: "failed"; message: string };

export function buildConflictResolutionInstructions(paths: string[]): string {
  return (
    `\n## STAGING MERGE CONFLICTS\n\n` +
    `The isolated worktree already has a merge from \`staging\` in progress. ` +
    `Resolve these paths before doing any other work:\n` +
    paths.map((path) => `- \`${path}\``).join("\n") +
    `\n\nKeep both valid changes where they are compatible. For code, preserve ` +
    `the branch's feature and the current staging contracts. For generated ` +
    `LLM context files, regenerate them after resolving their source content. ` +
    `Stage every resolution and create a gitmoji merge commit before testing and pushing.`
  );
}

export function mergeStagingIntoWorktree(
  worktreePath: string,
  baseBranch: string,
): StagingMergeResult {
  const merge = spawnSync(
    "git",
    ["merge", `origin/${baseBranch}`, "--no-edit"],
    {
      cwd: worktreePath,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_EDITOR: "true" },
    },
  );
  if (merge.status === 0) return { kind: "merged" };

  const paths = getUnmergedPaths(worktreePath);
  if (paths.length > 0) return { kind: "conflicted", paths };
  return {
    kind: "failed",
    message: `git merge origin/${baseBranch} exited with ${merge.status ?? "unknown"}`,
  };
}

export function getUnmergedPaths(worktreePath: string): string[] {
  try {
    return execFileSync("git", ["diff", "--name-only", "--diff-filter=U"], {
      cwd: worktreePath,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .map((path) => path.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function isWorktreePushed(
  worktreePath: string,
  branchName: string,
): boolean {
  try {
    execFileSync("git", ["fetch", "origin", branchName], {
      cwd: worktreePath,
      stdio: "ignore",
    });
    const localHead = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: worktreePath,
      encoding: "utf-8",
    }).trim();
    const remoteHead = execFileSync(
      "git",
      ["rev-parse", `origin/${branchName}`],
      {
        cwd: worktreePath,
        encoding: "utf-8",
      },
    ).trim();
    return localHead === remoteHead;
  } catch {
    return false;
  }
}
