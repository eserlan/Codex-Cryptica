// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { MockWorker, mockApi } = vi.hoisted(() => {
  const releaseProxySymbol = Symbol.for("comlink.releaseProxy");
  const mockApi = {
    initIndex: vi.fn().mockResolvedValue(true),
    add: vi.fn().mockResolvedValue(true),
    addBatch: vi.fn().mockResolvedValue(true),
    addBatchProgressive: vi.fn().mockImplementation((entries, options) =>
      Promise.resolve({
        runId: options.runId,
        vaultId: options.vaultId,
        acceptedCount: entries.length,
        failedIds: [],
      }),
    ),
    remove: vi.fn().mockResolvedValue(true),
    search: vi.fn().mockResolvedValue([{ id: "1", title: "Test", score: 1 }]),
    searchOptimized: vi
      .fn()
      .mockResolvedValue([{ id: "1", title: "Test", score: 1 }]),
    clear: vi.fn().mockResolvedValue(true),
    setLogger: vi.fn(),
    setChangeCallback: vi.fn(),
    exportIndex: vi.fn(),
    importIndex: vi.fn(),
    [releaseProxySymbol]: vi.fn(),
  };

  class MockWorker {
    constructor() {}
    postMessage() {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  }

  return { MockWorker, mockApi, releaseProxySymbol };
});

vi.stubGlobal("Worker", MockWorker);

// Mock Comlink
vi.mock("comlink", () => {
  return {
    wrap: vi.fn(() => mockApi),
    expose: vi.fn(),
    transfer: vi.fn((obj) => obj),
    proxy: vi.fn((fn) => fn),
    releaseProxy: Symbol.for("comlink.releaseProxy"),
  };
});

// Mock the worker import
vi.mock("../lib/workers/search.worker?worker", () => {
  return {
    default: MockWorker,
  };
});

// Mock debugStore
vi.mock("$lib/stores/debug.svelte", () => ({
  debugStore: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mock
import { SearchService } from "$lib/services/search.svelte";
import { debugStore } from "$lib/stores/debug.svelte";
import { vaultEventBus } from "$lib/stores/vault/events.svelte";

// Helpers to access collaborator internals without fragile prototype traversal
function coordinator(s: SearchService) {
  return (s as any).coordinator;
}
function pipeline(s: SearchService) {
  return (s as any).pipeline;
}
function persistence(s: SearchService) {
  return (s as any).persistence;
}

describe("SearchService", () => {
  let service: SearchService;

  beforeEach(() => {
    service = new SearchService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize", async () => {
    await expect(service.init()).resolves.toBeUndefined();
    expect(mockApi.setLogger).toHaveBeenCalledTimes(1);
    expect(mockApi.setChangeCallback).toHaveBeenCalledTimes(1);
    expect(mockApi.initIndex).not.toHaveBeenCalled();
  });

  it("should index an entry", async () => {
    const entry = {
      id: "1",
      title: "Test Note",
      content: "# Content",
      path: "/test.md",
      updatedAt: Date.now(),
    };
    await service.index(entry);
    expect(mockApi.add).toHaveBeenCalledWith(entry);
  });

  it("should chunk indexBatch work sequentially without eager full-array allocation", async () => {
    const originalAddBatch = mockApi.addBatch.getMockImplementation();
    const pendingAdds: Array<() => void> = [];

    try {
      mockApi.addBatch.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            pendingAdds.push(resolve);
          }),
      );

      await (service as any).ensureWorker();

      const entities = Array.from({ length: 102 }, (_, index) => ({
        id: `${index}`,
        title: `Entity ${index}`,
        content: `Content ${index}`,
        type: "note",
      }));

      const batchPromise = pipeline(service).indexBatch(entities);

      await vi.waitFor(() => {
        expect(mockApi.addBatch).toHaveBeenCalledTimes(1);
      });
      expect(pendingAdds).toHaveLength(1);

      pendingAdds.splice(0).forEach((resolve) => resolve());

      await vi.waitFor(() => {
        expect(mockApi.addBatch).toHaveBeenCalledTimes(2);
      });
      expect(pendingAdds).toHaveLength(1);

      pendingAdds.splice(0).forEach((resolve) => resolve());

      await expect(batchPromise).resolves.toBeUndefined();
    } finally {
      mockApi.addBatch.mockImplementation(originalAddBatch as any);
    }
  });

  it("should perform a search", async () => {
    const results = await service.search("query");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(mockApi.searchOptimized).toHaveBeenCalledWith(
      "query",
      expect.any(Object),
    );
  });

  it("should load an index from IndexedDB", async () => {
    const { entityDb } = await import("$lib/utils/entity-db");

    vi.spyOn(entityDb.searchIndex, "get").mockResolvedValueOnce({
      vaultId: "test-vault",
      data: { _docIds: ["1"], someSegment: "data" },
      updatedAt: 123,
    });

    const result = await service.loadIndex("test-vault");
    expect(result).toBe(true);
    expect(mockApi.importIndex).toHaveBeenCalledWith({
      _docIds: ["1"],
      someSegment: "data",
    });
  });

  it("should skip saving an empty index", async () => {
    const { entityDb } = await import("$lib/utils/entity-db");

    mockApi.exportIndex.mockResolvedValueOnce({ _docIds: [] });
    const putSpy = vi
      .spyOn(entityDb.searchIndex, "put")
      .mockResolvedValueOnce(undefined as any);

    await service.saveIndex("test-vault");

    expect(putSpy).not.toHaveBeenCalled();
  });

  it("should save a populated index to IndexedDB", async () => {
    const { entityDb } = await import("$lib/utils/entity-db");

    const expectedData = {
      _docIds: ["1"],
      segment1: "data",
    };
    mockApi.exportIndex.mockResolvedValueOnce(expectedData);
    const putSpy = vi
      .spyOn(entityDb.searchIndex, "put")
      .mockResolvedValueOnce(undefined as any);

    await service.saveIndex("test-vault");

    expect(putSpy).toHaveBeenCalledTimes(1);
    const putArg = putSpy.mock.calls[0][0];
    expect(putArg.vaultId).toBe("test-vault");
    expect(putArg.updatedAt).toEqual(expect.any(Number));

    const savedData = putArg.data;
    if (savedData instanceof Blob || savedData.constructor.name === "Blob") {
      const blobData = savedData as Blob;
      let text: string;
      if (typeof DecompressionStream !== "undefined") {
        const rawStream =
          typeof blobData.stream === "function"
            ? blobData.stream()
            : new ReadableStream({
                async start(controller) {
                  try {
                    const arrayBuffer = await blobData.arrayBuffer();
                    controller.enqueue(new Uint8Array(arrayBuffer));
                  } catch (err) {
                    controller.error(err);
                  }
                  controller.close();
                },
              });
        const stream = rawStream.pipeThrough(
          new DecompressionStream("deflate-raw"),
        );
        text = await new Response(stream).text();
      } else {
        text = await blobData.text();
      }
      expect(JSON.parse(text)).toEqual(expectedData);
    } else {
      expect(savedData).toEqual(expectedData);
    }
  });

  it("should bridge logs from worker to debugStore", async () => {
    await (service as any).ensureWorker();

    const logCallback = (mockApi.setLogger as any).mock.calls[0][0];
    expect(logCallback).toBeDefined();

    logCallback("info", "Test info message", { foo: "bar" });
    expect(debugStore.log).toHaveBeenCalledWith(
      "[SearchEngine] Test info message",
      { foo: "bar" },
    );

    logCallback("warn", "Test warn message");
    expect(debugStore.warn).toHaveBeenCalledWith(
      "[SearchEngine] Test warn message",
      undefined,
    );

    logCallback("error", "Test error message");
    expect(debugStore.error).toHaveBeenCalledWith(
      "[SearchEngine] Test error message",
      undefined,
    );
  });

  describe("Vault Events", () => {
    beforeEach(async () => {
      vaultEventBus.reset(false);
      service = new SearchService();
      await (service as any).ensureWorker();

      vaultEventBus.emit({ type: "VAULT_OPENING", vaultId: "v1" });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it("should clear index on VAULT_OPENING", async () => {
      await vaultEventBus.emit({ type: "VAULT_OPENING", vaultId: "new-vault" });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockApi.clear).toHaveBeenCalled();
      expect(coordinator(service).activeVaultId).toBe("new-vault");
    });

    it("should ignore events from other vaults", async () => {
      const indexBatchSpy = vi.spyOn(pipeline(service), "indexBatch");
      vaultEventBus.emit({
        type: "SYNC_CHUNK_READY",
        vaultId: "WRONG_VAULT",
        entities: { "1": { id: "1", title: "T1" } } as any,
        newOrChangedIds: ["1"],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(indexBatchSpy).not.toHaveBeenCalled();
    });

    it("should rebuild index on CACHE_LOADED if loadIndex fails", async () => {
      vi.spyOn(persistence(service), "loadIndex").mockResolvedValue(false);
      const indexBatchSpy = vi.spyOn(pipeline(service), "indexBatch");

      const entities = {
        "1": { id: "1", title: "Note 1", content: "body", type: "note" },
      } as any;
      vaultEventBus.emit({ type: "CACHE_LOADED", vaultId: "v1", entities });

      await vi.waitFor(() => {
        expect(indexBatchSpy).toHaveBeenCalled();
      });

      expect(indexBatchSpy).toHaveBeenCalledWith(Object.values(entities), {
        runId: expect.any(String),
        vaultId: "v1",
        totalCount: 1,
      });
      expect(pipeline(service).needsFullContentSweep).toBe(true);
    });

    it("should index chunks on SYNC_CHUNK_READY", async () => {
      const indexBatchSpy = vi.spyOn(pipeline(service), "indexBatch");
      const entities = {
        "1": { id: "1", title: "T1" },
        "2": { id: "2" },
      } as any;

      vaultEventBus.emit({
        type: "SYNC_CHUNK_READY",
        vaultId: "v1",
        entities,
        newOrChangedIds: ["1"],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(indexBatchSpy).toHaveBeenCalledWith([{ id: "1", title: "T1" }]);
    });

    it("should run background sync on SYNC_COMPLETE if needed", async () => {
      vi.useFakeTimers();
      try {
        pipeline(service).needsFullContentSweep = true;
        const syncSpy = vi
          .spyOn(pipeline(service), "indexContentInBackground")
          .mockResolvedValue(undefined);

        vaultEventBus.emit({ type: "SYNC_COMPLETE", vaultId: "v1" });

        vi.advanceTimersByTime(3000);
        await Promise.resolve();

        expect(syncSpy).toHaveBeenCalledWith("v1");
        expect(pipeline(service).needsFullContentSweep).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it("should index on ENTITY_UPDATED if relevant fields changed", async () => {
      const indexSpy = vi.spyOn(pipeline(service), "indexEntity");
      const entity = { id: "1", title: "Updated" };

      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: "v1",
        entity: entity as any,
        patch: { title: "Updated" },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(indexSpy).toHaveBeenCalled();
    });

    it("should skip index on ENTITY_UPDATED if no relevant fields changed", async () => {
      const indexSpy = vi.spyOn(pipeline(service), "indexEntity");
      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: "v1",
        entity: { id: "1" } as any,
        patch: { someOtherField: "val" } as any,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(indexSpy).not.toHaveBeenCalled();
    });

    it("should remove on ENTITY_DELETED", async () => {
      const removeSpy = vi.spyOn(pipeline(service), "remove");
      vaultEventBus.emit({
        type: "ENTITY_DELETED",
        vaultId: "v1",
        entityId: "1",
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(removeSpy).toHaveBeenCalledWith("1");
    });

    it("should index batch on BATCH_CREATED", async () => {
      const indexBatchSpy = vi.spyOn(pipeline(service), "indexBatch");
      vaultEventBus.emit({
        type: "BATCH_CREATED",
        vaultId: "v1",
        entities: [{ id: "1" }] as any,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(indexBatchSpy).toHaveBeenCalledWith([{ id: "1" }]);
    });
  });

  it("should handle encoded search results", async () => {
    const mockResults = [{ id: "1", title: "Decoded" }];
    const encodedData = new TextEncoder().encode(JSON.stringify(mockResults));

    mockApi.searchOptimized.mockResolvedValueOnce({
      isEncoded: true,
      data: encodedData,
    });

    const results = await service.search("query");
    expect(results).toEqual(mockResults);
  });

  it("should index content in background using Dexie and batching", async () => {
    vi.useFakeTimers();
    try {
      const { entityDb } = await import("$lib/utils/entity-db");
      const indexBatchSpy = vi
        .spyOn(pipeline(service), "indexBatch")
        .mockResolvedValue(undefined);

      await (service as any).ensureWorker();
      coordinator(service).activeVaultId = "v1";

      const mockRecords = Array.from({ length: 120 }, (_, i) => ({
        entityId: `${i}`,
        content: `content ${i}`,
        vaultId: "v1",
      }));

      const mockMetadatas = mockRecords.map((r) => ({
        id: r.entityId,
        title: `Title ${r.entityId}`,
      }));

      let contentCallCount = 0;
      vi.spyOn(entityDb.entityContent, "where").mockImplementation(
        (indexName?: any) => {
          if (indexName === "vaultId") {
            return {
              equals: vi.fn().mockReturnValue({
                count: vi.fn().mockResolvedValue(120),
              }),
            } as any;
          }
          return {
            between: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            toArray: vi.fn().mockImplementation(() => {
              if (contentCallCount === 0) {
                contentCallCount++;
                return Promise.resolve(mockRecords.slice(0, 100));
              } else if (contentCallCount === 1) {
                contentCallCount++;
                return Promise.resolve(mockRecords.slice(100));
              }
              return Promise.resolve([]);
            }),
          } as any;
        },
      );

      vi.spyOn(entityDb.graphEntities, "where").mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockMetadatas),
        }),
      } as any);

      const promise = pipeline(service).indexContentInBackground("v1");

      await vi.runAllTimersAsync();
      await promise;

      expect(indexBatchSpy).toHaveBeenCalledTimes(2);
      expect(indexBatchSpy.mock.calls[0][0]).toHaveLength(100);
      expect(indexBatchSpy.mock.calls[1][0]).toHaveLength(20);
    } finally {
      vi.useRealTimers();
    }
  });

  it("should terminate correctly", async () => {
    await (service as any).ensureWorker();

    const releaseSpy = vi.fn();
    (service as any).api = {
      ...mockApi,
      [Symbol.for("comlink.releaseProxy")]: releaseSpy,
    };
    const terminateSpy = vi.spyOn((service as any).worker, "terminate");

    service.terminate();

    expect(releaseSpy).toHaveBeenCalled();
    expect(terminateSpy).toHaveBeenCalled();
    expect((service as any).api).toBeNull();
    expect((service as any).worker).toBeNull();
  });

  describe("AutoSave and VisibilityChange", () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await (service as any).ensureWorker();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should debounce auto-save", async () => {
      const saveIndexSpy = vi
        .spyOn(persistence(service), "saveIndex")
        .mockResolvedValue(undefined);
      coordinator(service).activeVaultId = "v1";
      coordinator(service).isDirty = true;

      const changeCallback = (mockApi.setChangeCallback as any).mock
        .calls[0][0];
      changeCallback();

      expect(saveIndexSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);

      expect(saveIndexSpy).toHaveBeenCalledWith("v1");
    });

    it("should trigger emergency save on visibilitychange hidden", async () => {
      const saveIndexSpy = vi
        .spyOn(persistence(service), "saveIndex")
        .mockResolvedValue(undefined);
      coordinator(service).activeVaultId = "v1";
      coordinator(service).isDirty = true;

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });

      window.dispatchEvent(new Event("visibilitychange"));

      expect(saveIndexSpy).toHaveBeenCalledWith("v1");
    });

    it("should skip emergency save if NOT dirty", async () => {
      const saveIndexSpy = vi
        .spyOn(persistence(service), "saveIndex")
        .mockResolvedValue(undefined);
      coordinator(service).activeVaultId = "v1";
      coordinator(service).isDirty = false;

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });

      window.dispatchEvent(new Event("visibilitychange"));

      expect(saveIndexSpy).not.toHaveBeenCalled();
    });
  });

  describe("Mapping and Error Handling", () => {
    it("should map entity to search entry correctly", () => {
      const entity = {
        id: "e1",
        title: "Title",
        content: "Content",
        type: "note",
        _path: ["folder", "sub"],
        tags: ["t1", "t2"],
        lore: "Some lore",
        metadata: {
          key: ["val1", "val2"],
        },
      };

      const entry = pipeline(service).mapToSearchEntry(entity);

      expect(entry.id).toBe("e1");
      expect(entry.path).toBe("folder/sub");
      expect(entry.keywords).toContain("t1 t2");
      expect(entry.keywords).toContain("Some lore");
      expect(entry.keywords).toContain("val1 val2");
    });

    it("should handle error in loadIndex", async () => {
      const { entityDb } = await import("$lib/utils/entity-db");
      vi.spyOn(entityDb.searchIndex, "get").mockRejectedValue(
        new Error("DB Error"),
      );

      const result = await service.loadIndex("v1");
      expect(result).toBe(false);
      expect(debugStore.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load index"),
        expect.any(Error),
      );
    });

    it("should handle error in saveIndex", async () => {
      mockApi.exportIndex.mockRejectedValue(new Error("Export Error"));

      await service.saveIndex("v1");

      expect(debugStore.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to save index"),
        expect.any(Error),
      );
    });

    it("should handle error in indexContentInBackground", async () => {
      const { entityDb } = await import("$lib/utils/entity-db");
      vi.spyOn(entityDb.entityContent, "where").mockImplementation(() => {
        throw new Error("Query Error");
      });

      await (service as any).ensureWorker();
      coordinator(service).activeVaultId = "v1";

      await pipeline(service).indexContentInBackground("v1");

      expect(debugStore.warn).toHaveBeenCalledWith(
        expect.stringContaining("Background content sync failed"),
        expect.any(Error),
      );
    });

    it("should catch errors in index queue", async () => {
      mockApi.add.mockRejectedValueOnce(new Error("Queue Error"));
      await service.index({ id: "1" } as any);
      expect(debugStore.warn).toHaveBeenCalledWith(
        "Index error",
        expect.any(Error),
      );

      mockApi.remove.mockRejectedValueOnce(new Error("Remove Error"));
      await service.remove("1");
      expect(debugStore.warn).toHaveBeenCalledWith(
        "Index remove error",
        expect.any(Error),
      );
    });
  });
});
