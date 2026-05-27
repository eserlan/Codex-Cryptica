import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SyncActionExecutor,
  type SyncExecutionContext,
} from "../../src/SyncActionExecutor";
import { type SyncAction } from "../../src/DiffAlgorithm";
import { type SyncResult, type ISyncBackend } from "../../src/types";

describe("SyncActionExecutor", () => {
  let registryMock: any;
  let comparatorMock: any;
  let persistenceMock: any;
  let executor: SyncActionExecutor;
  let fsBackend: ISyncBackend;
  let opfsBackend: ISyncBackend;
  let result: SyncResult;

  beforeEach(() => {
    registryMock = {
      putEntry: vi.fn().mockResolvedValue(undefined),
      deleteEntry: vi.fn().mockResolvedValue(undefined),
    };

    comparatorMock = {
      compareContent: vi.fn().mockResolvedValue(true),
    };

    persistenceMock = {
      persistOpfsStateIfNeeded: vi.fn().mockResolvedValue(undefined),
      deleteOpfsStateIfNeeded: vi.fn().mockResolvedValue(undefined),
      getSerializableId: vi.fn((meta) =>
        typeof meta?.handle === "string" ? meta.handle : "serial-id",
      ),
    };

    executor = new SyncActionExecutor(
      registryMock,
      comparatorMock,
      persistenceMock,
    );

    fsBackend = {
      download: vi.fn().mockResolvedValue(new Blob(["fs-content"])),
      upload: vi
        .fn()
        .mockResolvedValue({ lastModified: 100, size: 10, hash: "fs-hash" }),
      delete: vi.fn().mockResolvedValue(undefined),
    } as any;

    opfsBackend = {
      download: vi.fn().mockResolvedValue(new Blob(["opfs-content"])),
      upload: vi
        .fn()
        .mockResolvedValue({ lastModified: 200, size: 10, hash: "opfs-hash" }),
      delete: vi.fn().mockResolvedValue(undefined),
    } as any;

    result = {
      updated: [],
      created: [],
      deleted: [],
      conflicts: [],
      failed: [],
    };
  });

  it("should handle MATCH_INITIAL with identical content correctly", async () => {
    const action: SyncAction = {
      type: "MATCH_INITIAL",
      path: "test.md",
      fsMetadata: { path: "test.md", size: 10, lastModified: 100 },
      opfsMetadata: {
        path: "test.md",
        size: 10,
        lastModified: 100,
        hash: "opfs-hash",
      },
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    await executor.execute(action, context, result);

    expect(comparatorMock.compareContent).toHaveBeenCalled();
    expect(persistenceMock.persistOpfsStateIfNeeded).toHaveBeenCalledTimes(2);
    expect(registryMock.putEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: "test.md",
        vaultId: "v1",
        status: "SYNCED",
      }),
    );
    expect(result.created).toHaveLength(0);
    expect(result.updated).toHaveLength(0);
  });

  it("should handle MATCH_INITIAL with non-identical content by delegating to HANDLE_CONFLICT", async () => {
    comparatorMock.compareContent.mockResolvedValue(false);

    const action: SyncAction = {
      type: "MATCH_INITIAL",
      path: "test.md",
      fsMetadata: { path: "test.md", size: 10, lastModified: 100 },
      opfsMetadata: {
        path: "test.md",
        size: 10,
        lastModified: 200,
        hash: "opfs-hash",
      },
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    await executor.execute(action, context, result);

    // Since we mock HANDLE_CONFLICT, it should fall through to conflict handling.
    // In HANDLE_CONFLICT, since opfs is newer (200 > 100), it downloads from OPFS and uploads to FS.
    expect(fsBackend.upload).toHaveBeenCalled();
    expect(result.updated).toContain("test.md");
  });

  it("should handle EXPORT_TO_FS when upload is needed", async () => {
    const action: SyncAction = {
      type: "EXPORT_TO_FS",
      path: "test.md",
      opfsMetadata: {
        path: "test.md",
        size: 10,
        lastModified: 200,
        hash: "opfs-hash",
      },
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    comparatorMock.compareContent.mockResolvedValue(false);

    await executor.execute(action, context, result);

    expect(opfsBackend.download).toHaveBeenCalledWith("test.md", undefined);
    expect(fsBackend.upload).toHaveBeenCalled();
    expect(registryMock.putEntry).toHaveBeenCalled();
    expect(result.created).toContain("test.md");
  });

  it("should handle EXPORT_TO_FS when content is already identical", async () => {
    const action: SyncAction = {
      type: "EXPORT_TO_FS",
      path: "test.md",
      fsMetadata: { path: "test.md", size: 12, lastModified: 100 },
      opfsMetadata: {
        path: "test.md",
        size: 12,
        lastModified: 200,
        hash: "opfs-hash",
      },
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    comparatorMock.compareContent.mockResolvedValue(true);

    await executor.execute(action, context, result);

    expect(opfsBackend.download).toHaveBeenCalledWith("test.md", undefined);
    expect(fsBackend.upload).not.toHaveBeenCalled();
    expect(registryMock.putEntry).toHaveBeenCalled();
    expect(result.created).toHaveLength(0);
  });

  it("should handle IMPORT_TO_OPFS when upload is needed", async () => {
    const action: SyncAction = {
      type: "IMPORT_TO_OPFS",
      path: "test.md",
      fsMetadata: { path: "test.md", size: 10, lastModified: 100 },
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    comparatorMock.compareContent.mockResolvedValue(false);

    await executor.execute(action, context, result);

    expect(fsBackend.download).toHaveBeenCalledWith("test.md", undefined);
    expect(opfsBackend.upload).toHaveBeenCalled();
    expect(registryMock.putEntry).toHaveBeenCalled();
    expect(result.created).toContain("test.md");
  });

  it("should handle IMPORT_TO_OPFS when content is already identical", async () => {
    const action: SyncAction = {
      type: "IMPORT_TO_OPFS",
      path: "test.md",
      fsMetadata: { path: "test.md", size: 10, lastModified: 100 },
      opfsMetadata: {
        path: "test.md",
        size: 10,
        lastModified: 200,
        hash: "opfs-hash",
      },
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    comparatorMock.compareContent.mockResolvedValue(true);

    await executor.execute(action, context, result);

    expect(fsBackend.download).toHaveBeenCalledWith("test.md", undefined);
    expect(opfsBackend.upload).not.toHaveBeenCalled();
    expect(registryMock.putEntry).toHaveBeenCalled();
    expect(result.created).toHaveLength(0);
  });

  it("should handle HANDLE_CONFLICT when contents match fast-path", async () => {
    const action: SyncAction = {
      type: "HANDLE_CONFLICT",
      path: "test.md",
      fsMetadata: { path: "test.md", size: 10, lastModified: 100 },
      opfsMetadata: {
        path: "test.md",
        size: 10,
        lastModified: 200,
        hash: "opfs-hash",
      },
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    comparatorMock.compareContent.mockResolvedValue(true);

    await executor.execute(action, context, result);

    expect(fsBackend.download).not.toHaveBeenCalled();
    expect(opfsBackend.download).not.toHaveBeenCalled();
    expect(registryMock.putEntry).toHaveBeenCalled();
    expect(result.updated).toHaveLength(0);
  });

  it("should handle HANDLE_CONFLICT when fs is newer", async () => {
    const action: SyncAction = {
      type: "HANDLE_CONFLICT",
      path: "test.md",
      fsMetadata: { path: "test.md", size: 10, lastModified: 300 },
      opfsMetadata: {
        path: "test.md",
        size: 10,
        lastModified: 200,
        hash: "opfs-hash",
      },
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    comparatorMock.compareContent.mockResolvedValue(false);

    await executor.execute(action, context, result);

    expect(fsBackend.download).toHaveBeenCalled();
    expect(opfsBackend.upload).toHaveBeenCalled();
    expect(result.updated).toContain("test.md");
  });

  it("should handle HANDLE_CONFLICT when opfs is newer", async () => {
    const action: SyncAction = {
      type: "HANDLE_CONFLICT",
      path: "test.md",
      fsMetadata: { path: "test.md", size: 10, lastModified: 100 },
      opfsMetadata: {
        path: "test.md",
        size: 10,
        lastModified: 200,
        hash: "opfs-hash",
      },
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    comparatorMock.compareContent.mockResolvedValue(false);

    await executor.execute(action, context, result);

    expect(opfsBackend.download).toHaveBeenCalled();
    expect(fsBackend.upload).toHaveBeenCalled();
    expect(result.updated).toContain("test.md");
  });

  it("should handle DELETE_FS correctly", async () => {
    const action: SyncAction = {
      type: "DELETE_FS",
      path: "test.md",
      registryEntry: {
        filePath: "test.md",
        vaultId: "v1",
        status: "SYNCED",
      } as any,
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    await executor.execute(action, context, result);

    expect(fsBackend.delete).toHaveBeenCalled();
    expect(registryMock.deleteEntry).toHaveBeenCalledWith("v1", "test.md");
    expect(persistenceMock.deleteOpfsStateIfNeeded).toHaveBeenCalled();
    expect(result.deleted).toContain("test.md");
  });

  it("should handle DELETE_OPFS correctly", async () => {
    const action: SyncAction = {
      type: "DELETE_OPFS",
      path: "test.md",
      registryEntry: {
        filePath: "test.md",
        vaultId: "v1",
        status: "SYNCED",
      } as any,
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    await executor.execute(action, context, result);

    expect(opfsBackend.delete).toHaveBeenCalled();
    expect(registryMock.deleteEntry).toHaveBeenCalledWith("v1", "test.md");
    expect(persistenceMock.deleteOpfsStateIfNeeded).toHaveBeenCalled();
    expect(result.deleted).toContain("test.md");
  });

  it("should throw AbortError when AbortSignal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const action: SyncAction = {
      type: "MATCH_INITIAL",
      path: "test.md",
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
      signal: controller.signal,
    };

    await expect(executor.execute(action, context, result)).rejects.toThrow(
      "AbortError",
    );
  });

  it("should correctly record conflicts in result when isConflict is true", async () => {
    const action: SyncAction = {
      type: "EXPORT_TO_FS",
      path: "test.md",
      isConflict: true,
      opfsMetadata: {
        path: "test.md",
        size: 10,
        lastModified: 200,
        hash: "opfs-hash",
      },
    };

    const context: SyncExecutionContext = {
      vaultId: "v1",
      fsBackend,
      opfsBackend,
    };

    comparatorMock.compareContent.mockResolvedValue(false);

    await executor.execute(action, context, result);

    expect(result.conflicts).toContain("test.md");
  });
});
