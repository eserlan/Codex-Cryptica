import { describe, expect, test } from "bun:test";
import { planTypecheck, runTypecheckChanged } from "./typecheck-changed.mjs";

const workspaces = [
  {
    name: "web",
    path: "apps/web",
    scripts: { "lint:types": "svelte-check" },
    dependencies: { "@codex/adventure-engine": "workspace:*" },
  },
  {
    name: "@codex/adventure-engine",
    path: "packages/adventure-engine",
    scripts: {},
    dependencies: {},
  },
];

describe("typecheck-changed", () => {
  test("plans incremental svelte-check locally and full svelte-check in CI", () => {
    const localSteps = planTypecheck({
      changedFiles: ["packages/adventure-engine/src/session-budget.ts"],
      workspaces,
      ci: false,
    });
    expect(localSteps).toEqual([
      {
        label: "web (svelte-check incremental+tsgo)",
        command: "bunx",
        args: [
          "svelte-check",
          "--tsconfig",
          "./tsconfig.typecheck.json",
          "--threshold",
          "error",
          "--diagnostic-sources",
          "js,svelte",
          "--incremental",
          "--tsgo",
        ],
        cwd: "apps/web",
      },
    ]);

    const ciSteps = planTypecheck({
      changedFiles: ["packages/adventure-engine/src/session-budget.ts"],
      workspaces,
      ci: true,
    });
    expect(ciSteps[0]?.args).toEqual([
      "svelte-check",
      "--tsconfig",
      "./tsconfig.json",
      "--threshold",
      "error",
    ]);
  });

  test("plans no steps for documentation-only or scripts-only changes", () => {
    expect(
      planTypecheck({
        changedFiles: ["docs/STYLE_GUIDE.md"],
        workspaces,
      }),
    ).toEqual([]);
    expect(
      planTypecheck({
        changedFiles: [
          "scripts/pr-gate.mjs",
          ".husky/pre-push",
          "specs/x/mini-spec.md",
        ],
        workspaces,
      }),
    ).toEqual([]);
  });

  test("returns true when no files changed on HEAD", async () => {
    const ok = await runTypecheckChanged({
      base: "HEAD",
      committedOnly: true,
      exec: () => {
        throw new Error("should not execute");
      },
    });
    expect(ok).toBe(true);
  });
});
