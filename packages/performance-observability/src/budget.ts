import {
  PERFORMANCE_BUDGET_SCHEMA_VERSION,
  PERFORMANCE_BUDGET_STATISTICS,
  PERFORMANCE_OPERATIONS,
  type PerformanceBudgetCheckV1,
  type PerformanceBudgetEntryV1,
  type PerformanceBudgetManifestV1,
  type PerformanceResultV1,
} from "./types";

const operationSet = new Set<string>(PERFORMANCE_OPERATIONS);
const statisticSet = new Set<string>(PERFORMANCE_BUDGET_STATISTICS);

export class PerformanceBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PerformanceBudgetError";
  }
}

function requireText(value: unknown, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PerformanceBudgetError(`${field} must be a non-empty string`);
  }
}

function requireNonNegative(value: unknown, field: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new PerformanceBudgetError(
      `${field} must be finite and non-negative`,
    );
  }
}

/** Validates checked-in budgets before a CI result can be evaluated. */
export function assertValidPerformanceBudgetManifest(
  manifest: PerformanceBudgetManifestV1,
): void {
  if (manifest.schemaVersion !== PERFORMANCE_BUDGET_SCHEMA_VERSION) {
    throw new PerformanceBudgetError(
      "budget manifest schema version is unsupported",
    );
  }
  if (manifest.mode !== "report-only" && manifest.mode !== "blocking") {
    throw new PerformanceBudgetError("budget manifest mode is unsupported");
  }
  requireText(manifest.fixtureVersion, "fixtureVersion");
  requireText(manifest.fixtureChecksum, "fixtureChecksum");
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    throw new PerformanceBudgetError("budget manifest must contain entries");
  }

  const seen = new Set<string>();
  for (const entry of manifest.entries) {
    assertValidPerformanceBudgetEntry(entry);
    const key = `${entry.scenario}:${entry.operation}:${entry.statistic}`;
    if (seen.has(key)) {
      throw new PerformanceBudgetError(`duplicate budget entry: ${key}`);
    }
    seen.add(key);
  }
}

function assertValidPerformanceBudgetEntry(
  entry: PerformanceBudgetEntryV1,
): void {
  requireText(entry.scenario, "scenario");
  if (!operationSet.has(entry.operation)) {
    throw new PerformanceBudgetError("budget operation is not allowlisted");
  }
  if (!statisticSet.has(entry.statistic)) {
    throw new PerformanceBudgetError("budget statistic is not allowlisted");
  }
  if (entry.unit !== "ms") {
    throw new PerformanceBudgetError("budget unit is unsupported");
  }
  for (const field of [
    "blockingLimitMs",
    "targetMs",
    "sampleCount",
    "baselineValueMs",
  ] as const) {
    requireNonNegative(entry[field], field);
  }
  if (!Number.isInteger(entry.sampleCount) || entry.sampleCount === 0) {
    throw new PerformanceBudgetError("sampleCount must be a positive integer");
  }
  for (const field of [
    "warmupPolicy",
    "baselineCommit",
    "browserVersion",
    "runnerImage",
    "capturedAt",
    "rationale",
  ] as const) {
    requireText(entry[field], field);
  }
  if (!Array.isArray(entry.relatedIssues) || entry.relatedIssues.length === 0) {
    throw new PerformanceBudgetError("relatedIssues must not be empty");
  }
  for (const issue of entry.relatedIssues) {
    if (!Number.isInteger(issue) || issue <= 0) {
      throw new PerformanceBudgetError(
        "relatedIssues must contain issue numbers",
      );
    }
  }
}

/** Evaluates summaries without treating missing, failed, or stale samples as passes. */
export function evaluatePerformanceBudgets(
  manifest: PerformanceBudgetManifestV1,
  result: PerformanceResultV1,
): PerformanceBudgetCheckV1[] {
  assertValidPerformanceBudgetManifest(manifest);
  if (result.schemaVersion !== manifest.schemaVersion) {
    throw new PerformanceBudgetError(
      "result and budget schema versions differ",
    );
  }

  return manifest.entries.map((entry) => {
    const summary = result.summaries.find(
      (candidate) => candidate.operation === entry.operation,
    );
    const observedMs = summary?.[entry.statistic];
    if (observedMs === undefined)
      return { entry, observedMs, status: "missing" };
    if (observedMs <= entry.blockingLimitMs) {
      return { entry, observedMs, status: "pass" };
    }
    return {
      entry,
      observedMs,
      status: manifest.mode === "blocking" ? "fail" : "report",
    };
  });
}
