import { describe, expect, test } from "bun:test";
import {
  findCoLocatedTests,
  getTestExecution,
  groupTestsByWorkspace,
  isUnitTestFile,
} from "./test-changed.mjs";

describe("test-changed", () => {
  test("finds test file directly if given a test file", () => {
    const tests = findCoLocatedTests("scripts/test-changed.test.ts");
    expect(tests).toContain("scripts/test-changed.test.ts");
  });

  test("finds co-located test for a component", () => {
    const tests = findCoLocatedTests(
      "apps/web/src/lib/components/generators/GeneratorConfigForm.svelte",
    );
    expect(tests).toContain(
      "apps/web/src/lib/components/generators/GeneratorConfigForm.test.ts",
    );
  });

  test("finds test in adjacent tests/ directory when file is under src/", () => {
    const tests = findCoLocatedTests("packages/adventure-engine/src/core.ts");
    expect(tests).toContain("packages/adventure-engine/tests/core.test.ts");
  });

  test("groups test files into their respective workspaces", () => {
    const files = [
      "apps/web/src/foo.test.ts",
      "packages/schema/src/bar.test.ts",
      "scripts/baz.test.ts",
    ];
    const groups = groupTestsByWorkspace(files);
    expect(groups.get("apps/web")).toEqual(["apps/web/src/foo.test.ts"]);
    expect(groups.get("packages/schema")).toEqual([
      "packages/schema/src/bar.test.ts",
    ]);
    expect(groups.get("root")).toEqual(["scripts/baz.test.ts"]);
  });

  test("excludes Playwright specs from unit-test targets", () => {
    expect(isUnitTestFile("apps/web/tests/bulk-labels.spec.ts")).toBe(false);
    expect(isUnitTestFile("apps/web\\tests\\bulk-labels.spec.ts")).toBe(false);
  });

  test("keeps vitest and bun test files as unit-test targets", () => {
    expect(isUnitTestFile("apps/web/src/lib/foo.test.ts")).toBe(true);
    expect(isUnitTestFile("packages/adventure-engine/tests/core.test.ts")).toBe(
      true,
    );
  });

  test("runs workspace tests through each workspace's declared test script", () => {
    expect(
      getTestExecution("packages/vault-engine", [
        "packages/vault-engine/src/local-thumbnail.test.ts",
      ]),
    ).toEqual({
      cwd: "packages/vault-engine",
      args: ["run", "test", "--", "src/local-thumbnail.test.ts"],
    });
    expect(
      getTestExecution("apps/web", ["apps/web/src/lib/example.test.ts"]),
    ).toEqual({
      cwd: "apps/web",
      args: ["run", "test", "--", "src/lib/example.test.ts"],
    });
  });
});
