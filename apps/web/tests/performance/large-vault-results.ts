import fs from "node:fs";
import path from "node:path";
import {
  createPerformanceResult,
  type PerformanceResultV1,
  type PerformanceSampleV1,
} from "@codex/performance-observability";
import {
  getLargeVaultFixtureChecksum,
  LARGE_VAULT_FIXTURE_VERSION,
} from "./fixtures/large-vault";

export interface LargeVaultResultMetadata {
  browserVersion: string;
  cacheState: "cold-and-warm";
}

/** Fixed user journeys used by the large-vault budget manifest. */
export const LARGE_VAULT_SCENARIOS = [
  "cold-open-index",
  "warm-open",
  "rendered-node-selection",
  "focus-depth-change",
  "explorer-workflow",
  "table-workflow",
  "entity-save",
] as const;

export type LargeVaultScenario = (typeof LARGE_VAULT_SCENARIOS)[number];
export type LargeVaultScenarioResults = Partial<
  Record<LargeVaultScenario, PerformanceResultV1>
>;

export function writeLargeVaultResults(
  samples: PerformanceSampleV1[],
  metadata: LargeVaultResultMetadata,
  scenarios: LargeVaultScenarioResults = {},
) {
  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    fixture: {
      version: LARGE_VAULT_FIXTURE_VERSION,
      checksum: getLargeVaultFixtureChecksum(),
    },
    environment: {
      viewport: "1440x900",
      deviceScaleFactor: 1,
      server: "production-preview",
      browserVersion: metadata.browserVersion,
      runnerImage:
        process.env.ImageOS ?? process.env.RUNNER_OS ?? "local-unknown",
      commitSha: process.env.GITHUB_SHA ?? "local-unknown",
      attempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? "1"),
      cacheState: metadata.cacheState,
    },
    results: createPerformanceResult(samples),
    scenarios: Object.fromEntries(
      Object.entries(scenarios).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  };
  const output =
    process.env.PERFORMANCE_RESULTS_PATH ??
    path.join("test-results", "large-vault-results.v1.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  return output;
}
