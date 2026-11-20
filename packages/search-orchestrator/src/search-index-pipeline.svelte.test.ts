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
    getApi: async () =>
      ({
        add: vi.fn(),
        addBatch: vi.fn(),
        addBatchProgressive: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
      }) as any,
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
  it("uses an injected clock for background content sync duration", async () => {
    const debug = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(141);
    const pipeline = new SearchIndexPipeline({
      db: {
        entityContent: {
          where: (field: string) =>
            field === "vaultId"
              ? { equals: () => ({ count: async () => 0 }) }
              : {
                  between: () => ({
                    limit: () => ({ toArray: async () => [] }),
                  }),
                },
        },
        graphEntities: {
          where: () => ({ equals: () => ({ toArray: async () => [] }) }),
        },
      },
      debug,
      timers: {
        setTimeout: (callback: TimerHandler) => {
          if (typeof callback === "function") callback();
          return 1;
        },
        clearTimeout: () => undefined,
      } as any,
      coordinator: {
        activeVaultId: "vault-1",
        activeRunId: "run-1",
        getIndexProgress: () => ({ indexedCount: 0 }),
        isActiveRun: () => true,
        emitProgress: vi.fn(),
      } as any,
      getApi: async () =>
        ({
          add: vi.fn(),
          addBatch: vi.fn(),
          addBatchProgressive: vi.fn(),
          remove: vi.fn(),
          clear: vi.fn(),
        }) as any,
      isApiReady: () => true,
      onSaveRequired: async () => undefined,
      measureClock: { now },
    });

    await pipeline.indexContentInBackground("vault-1");

    expect(debug.log).toHaveBeenLastCalledWith(
      "[SearchIndexPipeline] Background sync complete. Indexed 0 content records in 41.00ms",
    );
    expect(now).toHaveBeenCalledTimes(2);
  });

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
