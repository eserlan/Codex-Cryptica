import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeLargeVaultResults } from "./large-vault-results";

const outputDirectories: string[] = [];

afterEach(() => {
  for (const directory of outputDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  delete process.env.PERFORMANCE_RESULTS_PATH;
});

describe("writeLargeVaultResults", () => {
  it("writes aggregate-only samples with reproducible fixture provenance", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codex-perf-"));
    outputDirectories.push(directory);
    process.env.PERFORMANCE_RESULTS_PATH = path.join(directory, "result.json");

    const output = writeLargeVaultResults(
      [
        {
          schemaVersion: 1,
          operation: "graph_select",
          outcome: "completed",
          durationMs: 12,
        },
      ],
      { browserVersion: "Chromium 1", cacheState: "cold-and-warm" },
    );

    const result = JSON.parse(fs.readFileSync(output, "utf8"));
    expect(result.fixture).toEqual({
      version: "large-vault.v1",
      checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(result.environment).toMatchObject({
      browserVersion: "Chromium 1",
      cacheState: "cold-and-warm",
      attempt: 1,
    });
    expect(JSON.stringify(result)).not.toContain("Benchmark entity");
  });
});
