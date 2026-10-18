import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/promote-to-prod.yml", import.meta.url),
  "utf8",
);

describe("promote-to-prod workflow release comms trigger", () => {
  test("sends this workflow's own run id as promoteRunId", () => {
    expect(workflow).toContain(
      '-d "{\\"promoteRunId\\": \\"${{ github.run_id }}\\"}"',
    );
  });

  test("does not send the staging build's run id, which belongs to a different workflow", () => {
    expect(workflow).not.toContain(
      '-d "{\\"promoteRunId\\": \\"${{ needs.find-staging-build.outputs.run_id }}\\"}"',
    );
  });
});

describe("promote-to-prod workflow IndexNow notification (#3164)", () => {
  test("runs notify-search-indexes with base-ref and commit_sha", () => {
    expect(workflow).toContain("name: Notify Search Indexes (IndexNow)");
    expect(workflow).toContain("bun scripts/notify-search-indexes.ts");
    expect(workflow).toContain('--base-ref="origin/main"');
    expect(workflow).toContain(
      '--head-sha="${{ needs.find-staging-build.outputs.commit_sha }}"',
    );
    expect(workflow).toContain("bun install --frozen-lockfile");
    expect(workflow).toContain("continue-on-error: true");
  });
});

describe("promote-to-prod staging run lookup", () => {
  test("selects the newest successful staging push run from the API page", () => {
    expect(workflow).toContain(
      '"repos/$GH_REPO/actions/workflows/deploy.yml/runs?branch=staging&status=success&event=push&per_page=100"',
    );
    expect(workflow).toContain("sort_by(.created_at) | last // empty");
    expect(workflow).toContain(
      "RUN_SHA=$(jq -r '.head_sha // empty' <<<\"$RUN\")",
    );
    expect(workflow).toContain(
      'HEAD_SHA=$(gh api "repos/$GH_REPO/git/ref/heads/staging"',
    );
    expect(workflow).toContain(
      'if [ "$STATUS" != "ahead" ] || [ -n "$EXTRA" ]; then',
    );
    expect(workflow).toContain("staging has unbuilt changes");
    expect(workflow).toContain('if [ -z "$RUN_ID" ]; then');
    expect(workflow).not.toContain("--limit 50");
  });
});
