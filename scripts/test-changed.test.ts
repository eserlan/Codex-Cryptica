import { describe, expect, test } from "bun:test";
import {
  findCoLocatedTests,
  getWorkspaceTestInvocation,
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

  test("groups nested worker tests by their package workspace", () => {
    const files = [
      "apps/workers/oracle-proxy/src/llm/adaptors/gemini-adaptor.test.ts",
    ];
    const groups = groupTestsByWorkspace(files);
    expect(groups.get("apps/workers/oracle-proxy")).toEqual(files);
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

  test("runs workspace tests through the workspace's declared test script", () => {
    expect(
      getWorkspaceTestInvocation("packages/ai-engine", "@codex/ai-engine", [
        "packages/ai-engine/src/example.test.ts",
      ]),
    ).toEqual({
      cwd: "packages/ai-engine",
      args: [
        "run",
        "--filter",
        "@codex/ai-engine",
        "test",
        "--",
        "src/example.test.ts",
      ],
    });
  });

  test("runs root-level tests with Bun's root test command", () => {
    expect(
      getWorkspaceTestInvocation("root", "", [
        "scripts/sync-help-generators.test.ts",
      ]),
    ).toEqual({
      cwd: ".",
      args: ["test", "scripts/sync-help-generators.test.ts"],
    });
  });
});
