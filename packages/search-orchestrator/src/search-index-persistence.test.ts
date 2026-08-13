// @vitest-environment jsdom
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { SearchIndexPersistence } from "./search-index-persistence";
import {
  PerformanceRecorder,
  type PerformanceSampleV1,
} from "@codex/performance-observability";

// Simple pass-through mocks for CompressionStream and DecompressionStream to run in environments lacking them
class MockCompressionStream {
  readable: ReadableStream;
  writable: WritableStream;
  constructor(public format: string) {
    const ts = new TransformStream();
    this.readable = ts.readable;
    this.writable = ts.writable;
  }
}

class MockDecompressionStream {
  readable: ReadableStream;
  writable: WritableStream;
  constructor(public format: string) {
    const ts = new TransformStream();
    this.readable = ts.readable;
    this.writable = ts.writable;
  }
}

describe("SearchIndexPersistence", () => {
  let mockDb: any;
  let mockDebug: any;
  let mockCoordinator: any;
  let mockApi: any;
  let persistence: SearchIndexPersistence;
  let performanceSamples: PerformanceSampleV1[];

  let stubbedCompressionStream = false;
  let stubbedDecompressionStream = false;

  beforeAll(() => {
    // Stub CompressionStream and DecompressionStream if missing. Restored
    // manually in afterAll below rather than via vi.unstubAllGlobals(),
    // which this package's `bun test` runner doesn't implement.
    if (typeof globalThis.CompressionStream === "undefined") {
      vi.stubGlobal("CompressionStream", MockCompressionStream);
      stubbedCompressionStream = true;
    }
    if (typeof globalThis.DecompressionStream === "undefined") {
      vi.stubGlobal("DecompressionStream", MockDecompressionStream);
      stubbedDecompressionStream = true;
    }
  });

  afterAll(() => {
    if (stubbedCompressionStream) {
      delete (globalThis as any).CompressionStream;
    }
    if (stubbedDecompressionStream) {
      delete (globalThis as any).DecompressionStream;
    }
  });

  beforeEach(() => {
    mockDb = {
      searchIndex: {
        get: vi.fn(),
        put: vi.fn(),
      },
    };
    mockDebug = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    mockCoordinator = {
      activeVaultId: "",
      isDirty: true,
      createRunId: vi.fn().mockReturnValue("mock-run-id"),
      emitProgress: vi.fn(),
      getIndexProgress: vi
        .fn()
        .mockReturnValue({ vaultId: "vault-1", isPartial: false }),
    };
    mockApi = {
      exportIndex: vi.fn(),
      importIndex: vi.fn(),
    };
    performanceSamples = [];

    persistence = new SearchIndexPersistence({
      db: mockDb,
      debug: mockDebug,
      coordinator: mockCoordinator,
      getApi: async () => mockApi,
      performanceRecorder: new PerformanceRecorder({
        isEnabled: () => true,
        clock: { now: vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(9) },
        sink: { record: (sample) => performanceSamples.push(sample) },
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("saveIndex", () => {
    it("persists a worker-compressed transferable payload without main-thread encoding", async () => {
      const payload = {
        format: "fflate-json-v1" as const,
        data: new Uint8Array([1, 2, 3]),
        keyCount: 5,
      };
      mockApi.exportIndexCompressed = vi.fn().mockResolvedValue(payload);

      await persistence.saveIndex("vault-1");

      expect(mockApi.exportIndexCompressed).toHaveBeenCalledTimes(1);
      expect(mockApi.exportIndex).not.toHaveBeenCalled();
      expect(mockDb.searchIndex.put).toHaveBeenCalledWith(
        expect.objectContaining({
          vaultId: "vault-1",
          data: payload.data,
          format: "fflate-json-v1",
          keyCount: 5,
        }),
      );
    });

    it("coalesces idle saves so newer input supersedes pending persistence", async () => {
      const callbacks: Array<() => void> = [];
      const originalRequestIdleCallback = globalThis.requestIdleCallback;
      const originalCancelIdleCallback = globalThis.cancelIdleCallback;
      globalThis.requestIdleCallback = vi.fn((callback: () => void) => {
        callbacks.push(callback);
        return callbacks.length;
      }) as any;
      globalThis.cancelIdleCallback = vi.fn() as any;
      mockApi.exportIndexCompressed = vi.fn().mockResolvedValue({
        format: "fflate-json-v1",
        data: new Uint8Array([1]),
        keyCount: 5,
      });

      try {
        const first = persistence.saveIndex("vault-1");
        const second = persistence.saveIndex("vault-1");
        expect(mockApi.exportIndexCompressed).not.toHaveBeenCalled();

        callbacks[1]();
        await Promise.all([first, second]);
        expect(mockApi.exportIndexCompressed).toHaveBeenCalledTimes(1);
        expect(globalThis.cancelIdleCallback).toHaveBeenCalledTimes(1);
      } finally {
        if (originalRequestIdleCallback) {
          globalThis.requestIdleCallback = originalRequestIdleCallback;
        } else {
          delete (globalThis as any).requestIdleCallback;
        }
        if (originalCancelIdleCallback) {
          globalThis.cancelIdleCallback = originalCancelIdleCallback;
        } else {
          delete (globalThis as any).cancelIdleCallback;
        }
      }
    });

    it("should compress index data and save it as a Blob", async () => {
      const mockIndexData = { keyCount: 5, segments: { a: 1, b: 2 } };
      mockApi.exportIndex.mockResolvedValue(mockIndexData);

      await persistence.saveIndex("vault-1");

      expect(mockApi.exportIndex).toHaveBeenCalledTimes(1);
      expect(mockDb.searchIndex.put).toHaveBeenCalledTimes(1);

      const putArg = mockDb.searchIndex.put.mock.calls[0][0];
      expect(putArg.vaultId).toBe("vault-1");
      expect(putArg.data.constructor.name).toBe("Blob");
      expect(performanceSamples).toEqual([
        expect.objectContaining({
          operation: "search_index_persist",
          outcome: "completed",
          indexedInputCount: 5,
        }),
      ]);

      // Verify the Blob contents by decompressing it
      const blob = putArg.data as Blob;
      let text: string;
      if (typeof DecompressionStream !== "undefined") {
        const rawStream =
          typeof blob.stream === "function"
            ? blob.stream()
            : new ReadableStream({
                async start(controller) {
                  try {
                    const arrayBuffer = await blob.arrayBuffer();
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
        text = await blob.text();
      }
      expect(JSON.parse(text)).toEqual(mockIndexData);
    });

    it("should convert ArrayBuffer segments to strings before compression/saving", async () => {
      const encoder = new TextEncoder();
      const mockIndexData = {
        isSegmented: true,
        keyCount: 2,
        segments: {
          cfg: encoder.encode("flexsearch-config-data").buffer,
          _docIds: encoder.encode('["doc-1","doc-2"]').buffer,
        },
      };
      mockApi.exportIndex.mockResolvedValue(mockIndexData);

      await persistence.saveIndex("vault-1");

      expect(mockApi.exportIndex).toHaveBeenCalledTimes(1);
      expect(mockDb.searchIndex.put).toHaveBeenCalledTimes(1);

      const putArg = mockDb.searchIndex.put.mock.calls[0][0];
      expect(putArg.data.constructor.name).toBe("Blob");

      const blob = putArg.data as Blob;
      let text: string;
      if (typeof DecompressionStream !== "undefined") {
        const rawStream =
          typeof blob.stream === "function"
            ? blob.stream()
            : new ReadableStream({
                async start(controller) {
                  try {
                    const arrayBuffer = await blob.arrayBuffer();
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
        text = await blob.text();
      }

      const parsed = JSON.parse(text);
      expect(parsed.isSegmented).toBe(true);
      expect(parsed.segments.cfg).toBe("flexsearch-config-data");
      expect(parsed.segments._docIds).toBe('["doc-1","doc-2"]');
    });

    it("should fall back to raw JSON object if compression fails", async () => {
      // Mock global CompressionStream to throw
      const originalCS = globalThis.CompressionStream;
      globalThis.CompressionStream = vi.fn().mockImplementation(() => {
        throw new Error("Simulated stream error");
      }) as any;

      try {
        const mockIndexData = { keyCount: 5, segments: { a: 1, b: 2 } };
        mockApi.exportIndex.mockResolvedValue(mockIndexData);

        await persistence.saveIndex("vault-1");

        expect(mockDb.searchIndex.put).toHaveBeenCalledTimes(1);
        const putArg = mockDb.searchIndex.put.mock.calls[0][0];
        expect(putArg.data).toEqual(mockIndexData);
        expect(mockDebug.warn).toHaveBeenCalledWith(
          expect.stringContaining("Compression failed"),
          expect.any(Error),
        );
      } finally {
        globalThis.CompressionStream = originalCS;
      }
    });

    it("records an empty index as a successful no-op", async () => {
      mockApi.exportIndex.mockResolvedValue({ keyCount: 0 });

      await persistence.saveIndex("vault-1");

      expect(mockDb.searchIndex.put).not.toHaveBeenCalled();
      expect(performanceSamples).toEqual([
        expect.objectContaining({
          operation: "search_index_persist",
          outcome: "completed",
          indexedInputCount: 0,
        }),
      ]);
    });

    it("records a missing export as a failed save", async () => {
      mockApi.exportIndex.mockResolvedValue(undefined);

      await persistence.saveIndex("vault-1");

      expect(mockDb.searchIndex.put).not.toHaveBeenCalled();
      expect(performanceSamples).toEqual([
        expect.objectContaining({
          operation: "search_index_persist",
          outcome: "failed",
          errorKind: "unexpected",
        }),
      ]);
    });
  });

  describe("loadIndex", () => {
    it("imports worker-compressed records without decoding them on the main thread", async () => {
      const payload = {
        format: "fflate-json-v1" as const,
        data: new Uint8Array([1, 2, 3]),
        keyCount: 5,
      };
      mockApi.importIndexCompressed = vi.fn().mockResolvedValue(undefined);
      mockDb.searchIndex.get.mockResolvedValue({
        vaultId: "vault-1",
        data: payload.data,
        format: payload.format,
        keyCount: payload.keyCount,
      });

      await expect(persistence.loadIndex("vault-1")).resolves.toBe(true);
      expect(mockApi.importIndexCompressed).toHaveBeenCalledWith(payload);
      expect(mockApi.importIndex).not.toHaveBeenCalled();
    });

    it("treats corrupt worker-compressed records as a rebuild", async () => {
      mockApi.importIndexCompressed = vi
        .fn()
        .mockRejectedValue(new Error("corrupt payload"));
      mockDb.searchIndex.get.mockResolvedValue({
        vaultId: "vault-1",
        data: new Uint8Array([1, 2, 3]),
        format: "fflate-json-v1",
        keyCount: 5,
      });

      await expect(persistence.loadIndex("vault-1")).resolves.toBe(false);
      expect(mockDebug.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load index"),
        expect.any(Error),
      );
    });

    it("should load, decompress, and parse a compressed Blob record", async () => {
      const mockIndexData = { keyCount: 5, segments: { a: 1, b: 2 } };
      let compressedBlob: Blob;

      if (typeof CompressionStream !== "undefined") {
        const rawStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify(mockIndexData)),
            );
            controller.close();
          },
        });
        const stream = rawStream.pipeThrough(
          new CompressionStream("deflate-raw"),
        );
        compressedBlob = await new Response(stream).blob();
      } else {
        compressedBlob = new Blob([JSON.stringify(mockIndexData)]);
      }

      mockDb.searchIndex.get.mockResolvedValue({
        vaultId: "vault-1",
        data: compressedBlob,
        updatedAt: Date.now(),
      });

      const result = await persistence.loadIndex("vault-1");

      expect(result).toBe(true);
      expect(mockDb.searchIndex.get).toHaveBeenCalledWith("vault-1");
      expect(mockApi.importIndex).toHaveBeenCalledWith(mockIndexData);
      expect(mockCoordinator.emitProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: "ready" }),
      );
    });

    it("should correctly handle and load legacy uncompressed JSON record", async () => {
      const mockIndexData = { keyCount: 5, segments: { a: 1, b: 2 } };

      mockDb.searchIndex.get.mockResolvedValue({
        vaultId: "vault-1",
        data: mockIndexData,
        updatedAt: Date.now(),
      });

      const result = await persistence.loadIndex("vault-1");

      expect(result).toBe(true);
      expect(mockApi.importIndex).toHaveBeenCalledWith(mockIndexData);
    });

    it("should ignore corrupt segmented records with empty document IDs", async () => {
      const mockIndexData = {
        isSegmented: true,
        keyCount: 2,
        segments: {
          _docIds: "",
          cfg: "flexsearch-config-data",
        },
      };

      mockDb.searchIndex.get.mockResolvedValue({
        vaultId: "vault-1",
        data: mockIndexData,
        updatedAt: Date.now(),
      });

      const result = await persistence.loadIndex("vault-1");

      expect(result).toBe(false);
      expect(mockApi.importIndex).not.toHaveBeenCalled();
      expect(mockDebug.warn).toHaveBeenCalledWith(
        expect.stringContaining("missing document IDs"),
      );
    });
  });
});
