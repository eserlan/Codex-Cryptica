import { describe, expect, it } from "vitest";
import { buildConflictResolutionInstructions } from "./pr-worktree-merge.ts";

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
});
