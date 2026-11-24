import { describe, expect, test } from "bun:test";
import { buildGateTasks, runPrGate } from "./pr-gate.mjs";

describe("pr-gate", () => {
  test("passes --no-css to fallow when no css or svelte files changed", () => {
    const tasks = buildGateTasks({
      base: "origin/staging",
      changedFiles: ["packages/adventure-engine/src/session-budget.ts"],
    });
    const fallow = tasks.find((task) => task.name === "fallow");
    expect(fallow?.args).toContain("--no-css");
  });

  test("omits --no-css when a svelte or css file changed", () => {
    const tasks = buildGateTasks({
      base: "origin/staging",
      changedFiles: ["apps/web/src/lib/components/Foo.svelte"],
    });
    const fallow = tasks.find((task) => task.name === "fallow");
    expect(fallow?.args).not.toContain("--no-css");
  });

  test("runs all gates in parallel and returns true when all pass", async () => {
    const seen = [];
    const ok = await runPrGate({
      base: "origin/staging",
      runner: async (task) => {
        seen.push(task.name);
        return {
          name: task.name,
          ok: true,
          code: 0,
          durationMs: 12,
          output: "",
        };
      },
    });
    expect(ok).toBe(true);
    expect(seen).toEqual(["lint", "typecheck", "tests", "fallow"]);
  });

  test("waits for all gates and returns false if any gate fails", async () => {
    const seen = [];
    const ok = await runPrGate({
      base: "origin/staging",
      runner: async (task) => {
        seen.push(task.name);
        return {
          name: task.name,
          ok: task.name !== "fallow",
          code: task.name === "fallow" ? 1 : 0,
          durationMs: 15,
          output: task.name === "fallow" ? "complexity error" : "",
        };
      },
    });
    expect(ok).toBe(false);
    expect(seen).toEqual(["lint", "typecheck", "tests", "fallow"]);
  });
});
