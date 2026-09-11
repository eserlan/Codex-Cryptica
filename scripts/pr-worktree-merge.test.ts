import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildConflictResolutionInstructions,
  mergeStagingIntoWorktree,
} from "./pr-worktree-merge.ts";

describe("PR worktree merge", () => {
  it("gives the agent the conflicted paths and merge-commit requirement", () => {
    const instructions = buildConflictResolutionInstructions([
      "apps/web/src/lib/example.ts",
      "apps/web/src/lib/example.test.ts",
    ]);

    expect(instructions).toContain("apps/web/src/lib/example.ts");
    expect(instructions).toContain("apps/web/src/lib/example.test.ts");
    expect(instructions).toContain("gitmoji merge commit");
  });

  describe("mergeStagingIntoWorktree", () => {
    it("includes git's stderr in the failed result when the merge errors out for a non-conflict reason", async () => {
      const dir = await mkdtemp(join(tmpdir(), "pr-worktree-merge-test-"));
      const gitEnv = {
        ...process.env,
        GIT_AUTHOR_NAME: "test",
        GIT_AUTHOR_EMAIL: "test@example.com",
        GIT_COMMITTER_NAME: "test",
        GIT_COMMITTER_EMAIL: "test@example.com",
      };
      try {
        execFileSync("git", ["init"], { cwd: dir, env: gitEnv });
        execFileSync(
          "git",
          ["commit", "--allow-empty", "-m", "init"],
          { cwd: dir, env: gitEnv },
        );

        const result = mergeStagingIntoWorktree(dir, "does-not-exist");

        expect(result.kind).toBe("failed");
        if (result.kind === "failed") {
          expect(result.stderr.length).toBeGreaterThan(0);
          expect(result.message).toContain(result.stderr);
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  });
});
