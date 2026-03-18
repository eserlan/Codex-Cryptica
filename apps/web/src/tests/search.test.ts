// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { MockWorker, mockApi } = vi.hoisted(() => {
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
  };

  class MockWorker {
    constructor() {}
    postMessage() {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  }

  return { MockWorker, mockApi };
});

vi.stubGlobal("Worker", MockWorker);

// Mock Comlink
vi.mock("comlink", () => {
  return {
    wrap: vi.fn(() => mockApi),
    expose: vi.fn(),
    transfer: vi.fn((obj) => obj),
    proxy: vi.fn((fn) => fn),
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
});
