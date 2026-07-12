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

  test("keeps coverage and all required jobs behind the validation gate", () => {
    expect(workflow).toContain('bun run --filter "$workspace" test:coverage');
    expect(workflow).toContain(
      "needs: [select-validation, type-check, lint, test, build]",
    );
    expect(workflow).toContain("needs: [build, lint, test, type-check]");
    expect(workflow).toContain(
      "cp -r coverage-download/apps/web/coverage dist/coverage",
    );
  });
});
