import { describe, expect, test } from "bun:test";
import { YAML } from "bun";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/update-e2e-snapshots.yml", import.meta.url),
  "utf8",
);
const daily = await readFile(
  new URL("../.github/workflows/daily-e2e.yml", import.meta.url),
  "utf8",
);

const parsed = YAML.parse(workflow) as {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  jobs: Record<string, { steps: Array<{ run?: string }> }>;
};
/** Every `run:` script body in the workflow, to check for input interpolation. */
const runBlocks = Object.values(parsed.jobs)
  .flatMap((job) => job.steps)
  .flatMap((step) => (step.run ? [step.run] : []));

describe("update-e2e-snapshots workflow triggers and permissions", () => {
  test("runs only by hand", () => {
    expect(Object.keys(parsed.on)).toEqual(["workflow_dispatch"]);
  });

  test("asks for exactly contents and pull-requests write", () => {
    expect(parsed.permissions).toEqual({
      contents: "write",
      "pull-requests": "write",
    });
  });
});

describe("update-e2e-snapshots workflow input handling", () => {
  test("never interpolates an input inside a run script", () => {
    for (const block of runBlocks)
      expect(block).not.toMatch(/\$\{\{\s*(inputs|github\.event\.inputs)\./);
  });

  test("validates the spec path before using it", () => {
    expect(workflow).toContain(
      "spec_re='^apps/web/tests/[A-Za-z0-9._/-]+\\.spec\\.ts$'",
    );
    expect(workflow).toContain("*..*");
    expect(workflow).toContain('[[ ! -f "$SPEC" ]]');
  });

  test("restricts and bounds the grep filter", () => {
    expect(workflow).toContain("grep_re='^[A-Za-z0-9 _.:/()@-]+$'");
    expect(workflow).toContain("${#GREP} > 200");
  });
});

describe("update-e2e-snapshots workflow rendering and commit scope", () => {
  test("uses the same setup steps as the daily E2E run", () => {
    for (const line of [
      "uses: actions/checkout@v7",
      "uses: oven-sh/setup-bun@v2",
      "bun-version: latest",
      "uses: actions/cache@v6",
      "key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lock') }}",
      "run: bun install --frozen-lockfile",
      "run: bunx playwright install --with-deps chromium",
      "runs-on: ubuntu-latest",
    ]) {
      expect(daily).toContain(line);
      expect(workflow).toContain(line);
    }
  });

  test("stages only snapshot PNGs and refuses anything else", () => {
    expect(workflow).toContain("':(glob)apps/web/tests/**/*-snapshots/*.png'");
    expect(workflow).toContain(
      "outside the snapshot folders; refusing to commit",
    );
    expect(workflow).toContain("No snapshot changes");
  });

  test("takes the before sizes from the staging checkout", () => {
    expect(workflow).toContain('git show "HEAD:$path"');
    expect(workflow).not.toContain("origin/staging:");
  });

  test("names the branch per attempt so a re-run does not collide", () => {
    expect(workflow).toContain(
      "BRANCH: ci/update-snapshots-${{ github.run_id }}-${{ github.run_attempt }}",
    );
  });

  test("keeps the pushed branch when Actions cannot open the PR", () => {
    expect(workflow).toContain("if ! gh pr create");
    expect(workflow).toContain("compare/staging...$BRANCH?expand=1");
    expect(workflow).toContain('>> "$GITHUB_STEP_SUMMARY"');
  });
});
