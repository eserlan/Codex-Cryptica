import { describe, expect, test } from "bun:test";
import { findCoLocatedTests, groupTestsByWorkspace } from "./test-changed.mjs";

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
});
