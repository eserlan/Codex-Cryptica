import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/deploy.yml", import.meta.url),
  "utf8",
);

describe("deploy workflow critical path", () => {
  test("starts the web build after scope selection", () => {
    expect(workflow).toMatch(
      /\n {2}build:\n {4}name: Build\n {4}needs: select-validation\n/,
    );
  });

  test("does not serialize the build behind validation jobs", () => {
    expect(workflow).not.toContain(
      "needs: [select-validation, type-check, lint, test]",
    );
  });

  test("runs coverage after deployment in its dedicated job", () => {
    expect(workflow).toContain('bun run --filter "$workspace" test:coverage');
    expect(workflow).toContain(
      "coverage-deploy:\n    name: Coverage Deploy\n    needs: [select-validation, deploy]",
    );
    expect(workflow).toContain(
      "if: github.event_name == 'pull_request' && env.CLOUDFLARE_API_TOKEN != ''",
    );
    expect(workflow).toContain('if [ -d "apps/web/coverage" ]; then');
  });
});
