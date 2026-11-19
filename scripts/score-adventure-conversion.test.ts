import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

const run = (args: string[]) =>
  spawnSync(
    "bun",
    [resolve(root, "scripts/score-adventure-conversion.ts"), ...args],
    {
      encoding: "utf8",
      cwd: root,
    },
  );

const REF_CONV = "fixtures/adventures/reference-one-shot/adventure.v1.json";
const REF_KEY = "fixtures/adventures/reference-one-shot/answer-key.json";
const SPARSE = "fixtures/adventures/reference-one-shot/variants/sparse.v1.json";
const CLAUDE = "fixtures/adventures/conversions/claude-adventure.v1.json";

describe("score-adventure-conversion CLI", () => {
  it("exits 0 and prints every dimension for the reference conversion", () => {
    const result = run([REF_CONV, REF_KEY]);
    expect(result.status).toBe(0);
    for (const dim of [
      "schema",
      "references",
      "secrets",
      "coverage",
      "authoredVsRumour",
      "branches",
      "citations",
      "truncation",
      "fidelity",
    ]) {
      expect(result.stdout).toContain(dim);
    }
  });

  it("exits 1 and prints fidelity: fail for the sparse variant", () => {
    const result = run([SPARSE, REF_KEY]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("fidelity: fail");
  });

  it("exits 1 for the existing claude fixture", () => {
    const result = run([CLAUDE, REF_KEY]);
    expect(result.status).toBe(1);
  });

  it("exits 2 with a missing argument", () => {
    const result = run([REF_CONV]);
    expect(result.status).toBe(2);
  });

  it("exits 2 with usage for an unsupported option", () => {
    const result = run([REF_CONV, REF_KEY, "--bogus"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Usage:");
    expect(result.stderr).not.toContain("at parseArgs");
  });

  it("--json prints parseable JSON containing overall", () => {
    const result = run([REF_CONV, REF_KEY, "--json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty("overall", "pass");
  });
});
