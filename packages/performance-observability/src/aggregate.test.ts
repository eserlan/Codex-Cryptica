import { describe, expect, it } from "vitest";
import { createPerformanceResult, type PerformanceSampleV1 } from "./index";

const sample = (
  durationMs: number,
  outcome: PerformanceSampleV1["outcome"] = "completed",
): PerformanceSampleV1 => ({
  schemaVersion: 1,
  operation: "graph_select",
  outcome,
  durationMs,
  ...(outcome === "cancelled" ? { errorKind: "aborted" as const } : {}),
});

describe("createPerformanceResult", () => {
  it("creates deterministic completed-sample summaries", () => {
    const result = createPerformanceResult([
      sample(30),
      sample(10),
      sample(20),
      { ...sample(40), operation: "table_open" },
    ]);

    expect(result.summaries).toEqual([
      {
        operation: "graph_select",
        count: 3,
        medianMs: 20,
        p90Ms: 30,
        maxMs: 30,
      },
      {
        operation: "table_open",
        count: 1,
        medianMs: 40,
        p90Ms: 40,
        maxMs: 40,
      },
    ]);
  });

  it("retains failed outcomes but excludes them from successful statistics", () => {
    const result = createPerformanceResult([
      sample(10),
      sample(100, "cancelled"),
    ]);

    expect(result.summaries).toEqual([
      expect.objectContaining({
        operation: "graph_select",
        count: 1,
        maxMs: 10,
      }),
    ]);
    expect(result.outcomes).toMatchObject({ completed: 1, cancelled: 1 });
  });
});
