import {
  PERFORMANCE_OUTCOMES,
  PERFORMANCE_SCHEMA_VERSION,
  type PerformanceOperation,
  type PerformanceOutcome,
  type PerformanceResultV1,
  type PerformanceSampleV1,
  type PerformanceSummaryV1,
} from "./types";

function percentile(sortedValues: number[], percentileValue: number): number {
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * percentileValue) - 1),
  );
  return sortedValues[index];
}

/** Aggregates only completed samples; terminal failures stay visible in outcomes. */
export function createPerformanceResult(
  samples: readonly PerformanceSampleV1[],
): PerformanceResultV1 {
  const outcomes = Object.fromEntries(
    PERFORMANCE_OUTCOMES.map((outcome) => [outcome, 0]),
  ) as Record<PerformanceOutcome, number>;
  const grouped = new Map<PerformanceOperation, number[]>();

  for (const sample of samples) {
    outcomes[sample.outcome]++;
    if (sample.outcome !== "completed") continue;
    const durations = grouped.get(sample.operation) ?? [];
    durations.push(sample.durationMs);
    grouped.set(sample.operation, durations);
  }

  const summaries: PerformanceSummaryV1[] = [...grouped.entries()]
    .map(([operation, durations]) => {
      const sorted = [...durations].sort((left, right) => left - right);
      return {
        operation,
        count: sorted.length,
        medianMs: percentile(sorted, 0.5),
        p90Ms: percentile(sorted, 0.9),
        maxMs: sorted[sorted.length - 1],
      };
    })
    .sort((left, right) => left.operation.localeCompare(right.operation));

  return {
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    samples: [...samples],
    summaries,
    outcomes,
  };
}
