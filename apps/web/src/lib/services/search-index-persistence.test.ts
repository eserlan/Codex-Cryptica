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

  beforeAll(() => {
    // Stub CompressionStream and DecompressionStream if missing
    if (typeof globalThis.CompressionStream === "undefined") {
      vi.stubGlobal("CompressionStream", MockCompressionStream);
    }
    if (typeof globalThis.DecompressionStream === "undefined") {
      vi.stubGlobal("DecompressionStream", MockDecompressionStream);
    }
  });

  afterAll(() => {
    vi.unstubAllGlobals();
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

    persistence = new SearchIndexPersistence({
      db: mockDb,
      debug: mockDebug,
      coordinator: mockCoordinator,
      getApi: async () => mockApi,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("saveIndex", () => {
    it("should compress index data and save it as a Blob", async () => {
      const mockIndexData = { keyCount: 5, segments: { a: 1, b: 2 } };
      mockApi.exportIndex.mockResolvedValue(mockIndexData);

      await persistence.saveIndex("vault-1");

      expect(mockApi.exportIndex).toHaveBeenCalledTimes(1);
      expect(mockDb.searchIndex.put).toHaveBeenCalledTimes(1);

      const putArg = mockDb.searchIndex.put.mock.calls[0][0];
      expect(putArg.vaultId).toBe("vault-1");
      expect(putArg.data.constructor.name).toBe("Blob");

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
      vi.stubGlobal(
        "CompressionStream",
        vi.fn().mockImplementation(() => {
          throw new Error("Simulated stream error");
        }),
      );

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

      vi.stubGlobal("CompressionStream", originalCS);
    });
  });

  describe("loadIndex", () => {
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
