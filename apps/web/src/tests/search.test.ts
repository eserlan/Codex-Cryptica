// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { MockWorker, mockApi, releaseProxySymbol } = vi.hoisted(() => {
  const releaseProxySymbol = Symbol.for("comlink.releaseProxy");
  const mockApi = {
    initIndex: vi.fn().mockResolvedValue(true),
    add: vi.fn().mockResolvedValue(true),
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
import { SearchService } from "$lib/services/search";
import { debugStore } from "$lib/stores/debug.svelte";

describe("SearchService", () => {
  let service: SearchService;

  beforeEach(() => {
    service = new SearchService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize", async () => {
    await expect(service.init()).resolves.toBe(true);
    expect(mockApi.initIndex).toHaveBeenCalled();
  });

  it("should index an entry", async () => {
    const entry = {
      id: "1",
      title: "Test Note",
      content: "# Content",
      path: "/test.md",
      updatedAt: Date.now(),
    };
    await expect(service.index(entry)).resolves.toBe(true);
    expect(mockApi.add).toHaveBeenCalledWith(entry);
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

    // Mock the db response
    vi.spyOn(entityDb.searchIndex, "get").mockResolvedValueOnce({
      vaultId: "test-vault",
      data: { _docIds: ["1"], someSegment: "data" },
      updatedAt: 123,
    });

    // We need to bypass the initialization wait loop for testing
    (service as any).isInitialized = true;

    const result = await service.loadIndex("test-vault");
    expect(result).toBe(true);
    expect(mockApi.importIndex).toHaveBeenCalledWith({
      _docIds: ["1"],
      someSegment: "data",
    });
  });

  it("should skip saving an empty index", async () => {
    const { entityDb } = await import("$lib/utils/entity-db");

    // Mock the export to return an empty-ish index (only metadata)
    mockApi.exportIndex.mockResolvedValueOnce({ _docIds: [] });
    const putSpy = vi
      .spyOn(entityDb.searchIndex, "put")
      .mockResolvedValueOnce(undefined as any);

    await service.saveIndex("test-vault");

    // Should NOT have called put because length is <= 1
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("should save a populated index to IndexedDB", async () => {
    const { entityDb } = await import("$lib/utils/entity-db");

    // Mock the export to return a populated index
    mockApi.exportIndex.mockResolvedValueOnce({
      _docIds: ["1"],
      segment1: "data",
    });
    const putSpy = vi
      .spyOn(entityDb.searchIndex, "put")
      .mockResolvedValueOnce(undefined as any);

    await service.saveIndex("test-vault");

    // Should have called put because length is > 1
    expect(putSpy).toHaveBeenCalledWith({
      vaultId: "test-vault",
      data: { _docIds: ["1"], segment1: "data" },
      updatedAt: expect.any(Number),
    });
  });

  it("should bridge logs from worker to debugStore", () => {
    // Get the callback passed to setLogger
    const logCallback = (mockApi.setLogger as any).mock.calls[0][0];
    expect(logCallback).toBeDefined();

    // Test info level (should map to log)
    logCallback("info", "Test info message", { foo: "bar" });
    expect(debugStore.log).toHaveBeenCalledWith(
      "[SearchEngine] Test info message",
      { foo: "bar" },
    );

    // Test warn level
    logCallback("warn", "Test warn message");
    expect(debugStore.warn).toHaveBeenCalledWith(
      "[SearchEngine] Test warn message",
      undefined,
    );

    // Test error level
    logCallback("error", "Test error message");
    expect(debugStore.error).toHaveBeenCalledWith(
      "[SearchEngine] Test error message",
      undefined,
    );
  });

  describe("Vault Events", () => {
    let eventCallback: any;

    beforeEach(async () => {
      const { vaultEventBus } = await import("$lib/stores/vault/events");
      const subscribeSpy = vi.spyOn(vaultEventBus, "subscribe");
      // Create a new service instance to trigger subscription
      new SearchService();
      eventCallback = subscribeSpy.mock.calls.find(
        (call) => call[1] === "search-service",
      )?.[0];
    });

    it("should clear index on VAULT_OPENING", async () => {
      await eventCallback({ type: "VAULT_OPENING", vaultId: "new-vault" });
      expect(mockApi.clear).toHaveBeenCalled();
    });

    it("should rebuild index on CACHE_LOADED if loadIndex fails", async () => {
      vi.spyOn(service as any, "loadIndex").mockResolvedValue(false);
      const indexBatchSpy = vi.spyOn(service as any, "indexBatch");

      const entities = {
        "1": { id: "1", title: "Note 1", content: "body", type: "note" },
      };
      await eventCallback({ type: "CACHE_LOADED", vaultId: "v1", entities });

      expect(indexBatchSpy).toHaveBeenCalledWith(Object.values(entities));
      expect((service as any).needsFullContentSweep).toBe(true);
    });

    it("should index chunks on SYNC_CHUNK_READY", async () => {
      const indexBatchSpy = vi.spyOn(service as any, "indexBatch");
      const entities = { "1": { id: "1", title: "T1" }, "2": { id: "2" } };

      await eventCallback({
        type: "SYNC_CHUNK_READY",
        vaultId: "v1",
        entities,
        newOrChangedIds: ["1"],
      });

      expect(indexBatchSpy).toHaveBeenCalledWith([{ id: "1", title: "T1" }]);
    });

    it("should run background sync on SYNC_COMPLETE if needed", async () => {
      (service as any).needsFullContentSweep = true;
      const syncSpy = vi
        .spyOn(service as any, "indexContentInBackground")
        .mockResolvedValue(undefined);

      await eventCallback({ type: "SYNC_COMPLETE", vaultId: "v1" });

      expect(syncSpy).toHaveBeenCalledWith("v1");
      expect((service as any).needsFullContentSweep).toBe(false);
    });

    it("should index on ENTITY_UPDATED if relevant fields changed", async () => {
      const indexSpy = vi.spyOn(service, "index");
      const entity = { id: "1", title: "Updated" };

      await eventCallback({
        type: "ENTITY_UPDATED",
        vaultId: "v1",
        entity,
        patch: { title: "Updated" },
      });

      expect(indexSpy).toHaveBeenCalled();
    });

    it("should skip index on ENTITY_UPDATED if no relevant fields changed", async () => {
      const indexSpy = vi.spyOn(service, "index");
      await eventCallback({
        type: "ENTITY_UPDATED",
        vaultId: "v1",
        entity: { id: "1" },
        patch: { someOtherField: "val" },
      });
      expect(indexSpy).not.toHaveBeenCalled();
    });

    it("should remove on ENTITY_DELETED", async () => {
      const removeSpy = vi.spyOn(service, "remove");
      await eventCallback({
        type: "ENTITY_DELETED",
        vaultId: "v1",
        entityId: "1",
      });
      expect(removeSpy).toHaveBeenCalledWith("1");
    });

    it("should index batch on BATCH_CREATED", async () => {
      const indexBatchSpy = vi.spyOn(service as any, "indexBatch");
      await eventCallback({
        type: "BATCH_CREATED",
        vaultId: "v1",
        entities: [{ id: "1" }],
      });
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
    const { entityDb } = await import("$lib/utils/entity-db");
    const indexBatchSpy = vi
      .spyOn(service as any, "indexBatch")
      .mockResolvedValue(undefined);

    (service as any).api = mockApi;
    (service as any).activeVaultId = "v1";

    // Mock Dexie iteration
    const mockRecords = Array.from({ length: 60 }, (_, i) => ({
      entityId: `${i}`,
      content: `content ${i}`,
      vaultId: "v1",
    }));

    // Mock where().equals().each()
    const eachMock = vi.fn(async (callback) => {
      for (const record of mockRecords) {
        await callback(record);
      }
    });

    vi.spyOn(entityDb.entityContent, "where").mockReturnValue({
      equals: vi.fn().mockReturnValue({
        each: eachMock,
      }),
    } as any);

    // Mock metadata lookup
    vi.spyOn(entityDb.graphEntities, "get").mockImplementation(
      async ([_v, id]) => ({ id, title: `Title ${id}` }),
    );

    await (service as any).indexContentInBackground("v1");

    // Should have indexed in batches of 50
    expect(indexBatchSpy).toHaveBeenCalledTimes(2); // One for 50, one for remaining 10
    expect(indexBatchSpy.mock.calls[0][0]).toHaveLength(50);
    expect(indexBatchSpy.mock.calls[1][0]).toHaveLength(10);
  });

  it("should terminate correctly", () => {
    const releaseSpy = vi.fn();
    (service as any).api = {
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
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should debounce auto-save", async () => {
      const saveIndexSpy = vi
        .spyOn(service, "saveIndex")
        .mockResolvedValue(undefined);
      (service as any).activeVaultId = "v1";
      (service as any).isDirty = true;

      // Trigger change callback (simulated via API proxy)
      const changeCallback = (mockApi.setChangeCallback as any).mock.calls[0][0];
      changeCallback();

      // Should NOT have called saveIndex immediately
      expect(saveIndexSpy).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(2000);

      expect(saveIndexSpy).toHaveBeenCalledWith("v1");
    });

    it("should trigger emergency save on visibilitychange hidden", async () => {
      const saveIndexSpy = vi
        .spyOn(service, "saveIndex")
        .mockResolvedValue(undefined);
      (service as any).activeVaultId = "v1";
      (service as any).isDirty = true;

      // Mock visibilityState
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });

      window.dispatchEvent(new Event("visibilitychange"));

      expect(saveIndexSpy).toHaveBeenCalledWith("v1");
    });

    it("should skip emergency save if NOT dirty", async () => {
      const saveIndexSpy = vi
        .spyOn(service, "saveIndex")
        .mockResolvedValue(undefined);
      (service as any).activeVaultId = "v1";
      (service as any).isDirty = false;

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

      const entry = (service as any).mapToSearchEntry(entity);

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
      (service as any).isInitialized = true;

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

      (service as any).api = mockApi;
      (service as any).activeVaultId = "v1";

      await (service as any).indexContentInBackground("v1");

      expect(debugStore.warn).toHaveBeenCalledWith(
        expect.stringContaining("Background content sync failed"),
        expect.any(Error),
      );
    });

    it("should catch errors in index queue", async () => {
      mockApi.add.mockRejectedValueOnce(new Error("Queue Error"));
      await service.index({ id: "1" } as any);
      expect(debugStore.warn).toHaveBeenCalledWith("Index error", expect.any(Error));

      mockApi.remove.mockRejectedValueOnce(new Error("Remove Error"));
      await service.remove("1");
      expect(debugStore.warn).toHaveBeenCalledWith("Index remove error", expect.any(Error));
    });
  });
});
