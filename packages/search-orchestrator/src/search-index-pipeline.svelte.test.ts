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

  it("indexes content only when matching metadata exists", async () => {
    const records = [
      { entityId: "entry-1", content: "Indexed content", lore: "Indexed lore" },
      { entityId: "orphan", content: "No metadata", lore: "" },
    ];
    const addBatchProgressive = vi.fn(async () => ({
      vaultId: "vault-1",
      runId: "run-1",
      acceptedCount: 1,
      failedIds: [],
    }));
    const emitProgress = vi.fn();
    const onSaveRequired = vi.fn(async () => undefined);
    const pipeline = new SearchIndexPipeline({
      db: {
        entityContent: {
          where: (field: string) =>
            field === "vaultId"
              ? { equals: () => ({ count: async () => records.length }) }
              : {
                  between: () => ({
                    limit: () => ({ toArray: async () => records }),
                  }),
                },
        },
        graphEntities: {
          where: () => ({
            equals: () => ({
              toArray: async () => [{ id: "entry-1", title: "Entry" }],
            }),
          }),
        },
      },
      debug: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
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
        emitProgress,
      } as any,
      getApi: async () =>
        ({
          add: vi.fn(),
          addBatch: vi.fn(),
          addBatchProgressive,
          remove: vi.fn(),
          clear: vi.fn(),
        }) as any,
      isApiReady: () => true,
      onSaveRequired,
    });

    await pipeline.indexContentInBackground("vault-1");

    expect(addBatchProgressive).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "entry-1",
          title: "Entry",
          content: "Indexed content",
          keywords: "Indexed lore",
        }),
      ],
      expect.objectContaining({ runId: "run-1", vaultId: "vault-1" }),
    );
    expect(emitProgress).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ready", indexedCount: 1 }),
    );
    expect(onSaveRequired).toHaveBeenCalledWith("vault-1");
  });

  it("stops before querying when the active vault changes during idle yield", async () => {
    const emitProgress = vi.fn();
    const coordinator = {
      activeVaultId: "vault-1",
      activeRunId: "run-1",
      getIndexProgress: () => ({ indexedCount: 0 }),
      isActiveRun: vi.fn(() => true),
      emitProgress,
    };
    const where = vi.fn();
    const pipeline = new SearchIndexPipeline({
      db: { entityContent: { where }, graphEntities: { where } },
      debug: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      timers: {
        setTimeout: (callback: TimerHandler) => {
          coordinator.activeVaultId = "vault-2";
          if (typeof callback === "function") callback();
          return 1;
        },
        clearTimeout: () => undefined,
      } as any,
      coordinator: coordinator as any,
      getApi: async () => ({}) as any,
      isApiReady: () => true,
      onSaveRequired: async () => undefined,
    });

    await pipeline.indexContentInBackground("vault-1");

    expect(where).not.toHaveBeenCalled();
    expect(emitProgress).not.toHaveBeenCalled();
    expect(coordinator.isActiveRun).not.toHaveBeenCalled();
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
