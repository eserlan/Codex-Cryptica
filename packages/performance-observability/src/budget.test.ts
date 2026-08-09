import { describe, expect, it } from "vitest";
import {
  assertValidPerformanceBudgetManifest,
  evaluatePerformanceBudgets,
  type PerformanceBudgetManifestV1,
  type PerformanceResultV1,
} from "./index";

const manifest = (): PerformanceBudgetManifestV1 => ({
  schemaVersion: 1,
  mode: "report-only",
  fixtureVersion: "large-vault.v1",
  fixtureChecksum: "synthetic-checksum",
  entries: [
    {
      scenario: "rendered-node-selection",
      operation: "graph_select",
      statistic: "p90Ms",
      unit: "ms",
      blockingLimitMs: 50,
      targetMs: 25,
      sampleCount: 10,
      warmupPolicy: "one warm-up run",
      baselineValueMs: 42,
      baselineCommit: "abcdef0",
      browserVersion: "Chromium 1",
      runnerImage: "ubuntu",
      capturedAt: "2026-08-09T00:00:00.000Z",
      rationale: "report-only baseline",
      relatedIssues: [2140],
    },
  ],
});

const result = (p90Ms = 42): PerformanceResultV1 => ({
  schemaVersion: 1,
  samples: [],
  summaries: [
    { operation: "graph_select", count: 10, medianMs: 20, p90Ms, maxMs: 45 },
  ],
  outcomes: { completed: 10, cancelled: 0, stale: 0, failed: 0 },
});

describe("performance budgets", () => {
  it("reports, rather than passes, an over-budget result in report-only mode", () => {
    expect(evaluatePerformanceBudgets(manifest(), result(51))).toEqual([
      expect.objectContaining({ observedMs: 51, status: "report" }),
    ]);
  });

  it("fails an over-budget result in blocking mode", () => {
    const blocking = manifest();
    blocking.mode = "blocking";
    expect(evaluatePerformanceBudgets(blocking, result(51))).toEqual([
      expect.objectContaining({ status: "fail" }),
    ]);
  });

  it("rejects duplicate entries and does not count missing samples as passes", () => {
    const duplicate = manifest();
    duplicate.entries.push({ ...duplicate.entries[0] });
    expect(() => assertValidPerformanceBudgetManifest(duplicate)).toThrow(
      "duplicate budget entry",
    );
    expect(
      evaluatePerformanceBudgets(manifest(), { ...result(), summaries: [] }),
    ).toEqual([expect.objectContaining({ status: "missing" })]);
  });
});
