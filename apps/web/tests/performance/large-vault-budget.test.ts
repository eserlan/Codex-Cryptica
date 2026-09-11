import { describe, expect, it } from "vitest";
import type {
  PerformanceBudgetManifestV1,
  PerformanceOperation,
  PerformanceResultV1,
} from "@codex/performance-observability";
import {
  evaluateLargeVaultBudgets,
  formatLargeVaultBudgetSummary,
} from "./large-vault-budget";
import {
  LARGE_VAULT_SCENARIOS,
  type LargeVaultScenario,
} from "./large-vault-results";

const manifest = (): PerformanceBudgetManifestV1 => ({
  schemaVersion: 1,
  mode: "report-only",
  fixtureVersion: "large-vault.v1",
  fixtureChecksum: "checksum",
  entries: [
    ...LARGE_VAULT_SCENARIOS.flatMap((scenario) => operationsFor(scenario)),
  ],
});

function operationsFor(scenario: LargeVaultScenario) {
  const operations: Record<LargeVaultScenario, PerformanceOperation[]> = {
    "cold-open-index": ["vault_open_cold", "search_index_persist"],
    "warm-open": ["vault_open_warm"],
    "rendered-node-selection": ["graph_select"],
    "focus-depth-change": ["graph_focus_depth_change"],
    "explorer-workflow": ["explorer_open", "explorer_filter"],
    "table-workflow": ["table_open", "table_sort", "table_filter"],
    "entity-save": ["entity_save"],
  };
  return operations[scenario].map((operation) => ({
    scenario,
    operation,
    statistic: "p90Ms" as const,
    unit: "ms" as const,
    blockingLimitMs: 50,
    targetMs: 25,
    sampleCount: 1,
    warmupPolicy: "test warmup",
    baselineValueMs: 20,
    baselineCommit: "abcdef0",
    browserVersion: "Chromium 1",
    runnerImage: "ubuntu",
    capturedAt: "2026-08-10T00:00:00.000Z",
    rationale: "test budget",
    relatedIssues: [2149],
  }));
}

function result(operations: PerformanceOperation[]): PerformanceResultV1 {
  return {
    schemaVersion: 1,
    samples: operations.map((operation) => ({
      schemaVersion: 1,
      operation,
      outcome: "completed" as const,
      durationMs: 20,
    })),
    summaries: operations.map((operation) => ({
      operation,
      count: 1,
      medianMs: 20,
      p90Ms: 20,
      maxMs: 20,
    })),
    outcomes: {
      completed: operations.length,
      cancelled: 0,
      stale: 0,
      failed: 0,
    },
  };
}

function artifact() {
  const scenarios = Object.fromEntries(
    LARGE_VAULT_SCENARIOS.map((scenario) => [
      scenario,
      result(operationsFor(scenario).map((entry) => entry.operation)),
    ]),
  );
  return {
    schemaVersion: 1,
    fixture: { version: "large-vault.v1", checksum: "checksum" },
    environment: {},
    results: result(["graph_select"]),
    scenarios,
  };
}

describe("large-vault budget evaluation", () => {
  it("passes a complete scenario-attributed artifact", () => {
    const checks = evaluateLargeVaultBudgets(manifest(), artifact());
    expect(checks).toHaveLength(11);
    expect(checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("reports a report-only regression and formats it for GitHub summaries", () => {
    const input = artifact();
    input.scenarios["rendered-node-selection"].summaries[0].p90Ms = 51;
    const checks = evaluateLargeVaultBudgets(manifest(), input);
    expect(checks).toContainEqual(
      expect.objectContaining({ status: "report" }),
    );
    expect(formatLargeVaultBudgetSummary(checks)).toContain(
      "| rendered-node-selection |",
    );
  });

  it("rejects unknown scenarios and marks incomplete evidence missing", () => {
    const unknown = artifact();
    unknown.scenarios.unexpected = result(["graph_select"]);
    expect(() => evaluateLargeVaultBudgets(manifest(), unknown)).toThrow(
      "result has unknown scenarios",
    );

    const incomplete = artifact();
    incomplete.scenarios["entity-save"].summaries = [];
    expect(evaluateLargeVaultBudgets(manifest(), incomplete)).toContainEqual(
      expect.objectContaining({ status: "missing" }),
    );
  });
});
