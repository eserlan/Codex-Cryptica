import { describe, expect, test } from "bun:test";
import { selectAffectedWorkspaces } from "./affected-workspaces.mjs";

const workspaces = [
  {
    name: "schema",
    path: "packages/schema",
    scripts: { lint: "eslint" },
    dependencies: {},
  },
  {
    name: "engine",
    path: "packages/engine",
    scripts: { test: "bun test" },
    dependencies: { schema: "workspace:*" },
  },
  {
    name: "web",
    path: "apps/web",
    scripts: { build: "vite build" },
    dependencies: { engine: "workspace:*" },
  },
  {
    name: "unrelated",
    path: "packages/unrelated",
    scripts: {},
    dependencies: {},
  },
];

describe("selectAffectedWorkspaces", () => {
  test("selects a focused workspace without unrelated packages", () => {
    const result = selectAffectedWorkspaces(workspaces, [
      "packages/unrelated/src/index.ts",
    ]);
    expect(result.workspaces.map(({ name }) => name)).toEqual(["unrelated"]);
    expect(result.full).toBe(false);
  });

  test("widens shared-package changes through transitive dependents", () => {
    const result = selectAffectedWorkspaces(workspaces, [
      "packages/schema/src/index.ts",
    ]);
    expect(result.workspaces.map(({ name }) => name)).toEqual([
      "schema",
      "engine",
      "web",
    ]);
    expect(result.reasons.web).toContain("engine");
  });

  test("runs everything for toolchain changes", () => {
    const result = selectAffectedWorkspaces(workspaces, ["bun.lock"]);
    expect(result.workspaces).toHaveLength(4);
    expect(result.full).toBe(true);
  });
});
