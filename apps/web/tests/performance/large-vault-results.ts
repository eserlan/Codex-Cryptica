import fs from "node:fs";
import path from "node:path";
import {
  createPerformanceResult,
  type PerformanceSampleV1,
} from "@codex/performance-observability";

export function writeLargeVaultResults(samples: PerformanceSampleV1[]) {
  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    environment: {
      viewport: "1440x900",
      deviceScaleFactor: 1,
      server: "production-preview",
    },
    results: createPerformanceResult(samples),
  };
  const output =
    process.env.PERFORMANCE_RESULTS_PATH ??
    path.join("test-results", "large-vault-results.v1.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  return output;
}
