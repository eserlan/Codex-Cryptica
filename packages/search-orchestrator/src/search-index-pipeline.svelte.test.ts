import { describe, expect, it, vi } from "vitest";
import {
  PerformanceRecorder,
  type PerformanceSampleV1,
} from "@codex/performance-observability";
import { SearchIndexPipeline } from "./search-index-pipeline.svelte";

function createPipeline(active = true) {
  const samples: PerformanceSampleV1[] = [];
  let now = 0;
  const pipeline = new SearchIndexPipeline({
    coordinator: {
      activeVaultId: "vault-1",
      getIndexProgress: () => ({ indexedCount: 0 }),
      isActiveRun: () => active,
      emitProgress: vi.fn(),
    } as any,
    getApi: async () => ({
      add: vi.fn(),
      addBatch: vi.fn(),
      addBatchProgressive: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    }),
    isApiReady: () => true,
    onSaveRequired: async () => undefined,
    performanceRecorder: new PerformanceRecorder({
      isEnabled: () => true,
      clock: { now: () => ++now },
      sink: { record: (sample) => samples.push(sample) },
    }),
  });
  return { pipeline, samples };
}

describe("SearchIndexPipeline performance instrumentation", () => {
  it("records an allowlisted completed batch", async () => {
    const { pipeline, samples } = createPipeline();

    await pipeline.indexBatch([
      { id: "synthetic-1", title: "Synthetic", type: "npc" },
    ]);

    expect(samples).toEqual([
      expect.objectContaining({
        operation: "search_index_batch",
        outcome: "completed",
        indexedInputCount: 1,
      }),
    ]);
  });

  it("marks a stale progressive batch instead of completing it", async () => {
    const { pipeline, samples } = createPipeline(false);

    await pipeline.indexBatch(
      [{ id: "synthetic-1", title: "Synthetic", type: "npc" }],
      { runId: "run-1", vaultId: "vault-1", totalCount: 1 },
    );

    expect(samples).toEqual([
      expect.objectContaining({
        operation: "search_index_batch",
        outcome: "stale",
        errorKind: "stale_run",
      }),
    ]);
  });
});
