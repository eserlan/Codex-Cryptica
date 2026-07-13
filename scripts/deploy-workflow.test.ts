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

  test("keeps all required jobs behind the validation gate", () => {
    expect(workflow).toContain(
      "needs: [select-validation, type-check, lint, test, build]",
    );
    expect(workflow).toContain("needs: [build, lint, test, type-check]");
  });

  test("does not run coverage instrumentation on the pre-deploy critical path", () => {
    const preDeploy = workflow.slice(0, workflow.indexOf("\n  coverage-deploy:"));
    expect(preDeploy).not.toContain("test:coverage");
  });

  test("runs coverage in a dedicated post-deploy job gated on deploy success", () => {
    const coverageJob = workflow.slice(workflow.indexOf("\n  coverage-deploy:"));
    expect(coverageJob).toContain("needs: [select-validation, deploy]");
    expect(coverageJob).toContain("needs.deploy.result == 'success'");
    expect(coverageJob).toContain('bun run --filter "$workspace" test:coverage');
    expect(coverageJob).toContain("cp -r apps/web/coverage dist/coverage");
  });
});
