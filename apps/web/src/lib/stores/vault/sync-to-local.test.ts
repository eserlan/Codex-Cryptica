import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncToLocal, importFromFolder } from "./io";
import * as opfsUtils from "../../utils/opfs";
import * as vaultIoUtils from "../../utils/vault-io";
import { getDB } from "../../utils/idb";

// Mock dependencies
vi.mock("../../utils/opfs", () => ({
  walkOpfsDirectory: vi.fn(),
  writeOpfsFile: vi.fn(),
  getDirHandle: vi.fn(),
}));

vi.mock("../../utils/vault-io", () => ({
  reResolveFileHandle: vi.fn(),
  writeWithRetry: vi.fn(),
}));

vi.mock("$lib/stores/debug.svelte", () => ({
  debugStore: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
  }),
}));

describe("syncToLocal Optimization", () => {
  const mockLocalHandle = {
    name: "Local Folder",
    queryPermission: vi.fn().mockResolvedValue("granted"),
  } as any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default getDB behavior
    const db = await getDB();
    vi.mocked(db.get).mockResolvedValue(mockLocalHandle);

    // Mock showDirectoryPicker
    if (typeof window !== "undefined") {
      (window as any).showDirectoryPicker = vi
        .fn()
        .mockResolvedValue(mockLocalHandle);
    } else {
      (global as any).window = {
        showDirectoryPicker: vi.fn().mockResolvedValue(mockLocalHandle),
      };
    }
  });

  it("should SKIP sync if local file is up to date", async () => {
    const activeVaultId = "test-vault";
    const updateStatus = vi.fn();

    const mockOpfsFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 10000,
      }),
    };

    vi.mocked(opfsUtils.walkOpfsDirectory).mockResolvedValue([
      {
        handle: mockOpfsFileHandle as any,
        path: ["test.md"],
      },
    ]);

    const mockExistingLocalFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 11000, // Newer than OPFS
      }),
    };

    vi.mocked(vaultIoUtils.reResolveFileHandle).mockResolvedValue(
      mockExistingLocalFileHandle as any,
    );

    await syncToLocal(activeVaultId, {} as any, updateStatus);

    expect(vaultIoUtils.writeWithRetry).not.toHaveBeenCalled();
  });

  it("should PERFORM sync if local file is older", async () => {
    const activeVaultId = "test-vault";
    const updateStatus = vi.fn();

    const mockOpfsFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 20000,
      }),
    };

    vi.mocked(opfsUtils.walkOpfsDirectory).mockResolvedValue([
      {
        handle: mockOpfsFileHandle as any,
        path: ["test.md"],
      },
    ]);

    const mockOldLocalFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 10000, // Older
      }),
    };

    vi.mocked(vaultIoUtils.reResolveFileHandle).mockResolvedValue(
      mockOldLocalFileHandle as any,
    );

    await syncToLocal(activeVaultId, {} as any, updateStatus);

    expect(vaultIoUtils.writeWithRetry).toHaveBeenCalled();
  });

  it("should PERFORM sync if local file size differs", async () => {
    const activeVaultId = "test-vault";
    const updateStatus = vi.fn();

    const mockOpfsFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 200, // Different size
        lastModified: 10000,
      }),
    };

    vi.mocked(opfsUtils.walkOpfsDirectory).mockResolvedValue([
      {
        handle: mockOpfsFileHandle as any,
        path: ["test.md"],
      },
    ]);

    const mockDifferentSizeLocalFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 10000,
      }),
    };

    vi.mocked(vaultIoUtils.reResolveFileHandle).mockResolvedValue(
      mockDifferentSizeLocalFileHandle as any,
    );

    await syncToLocal(activeVaultId, {} as any, updateStatus);

    expect(vaultIoUtils.writeWithRetry).toHaveBeenCalled();
  });

  it("should respect clock skew tolerance when syncing", async () => {
    const activeVaultId = "test-vault";
    const updateStatus = vi.fn();

    const mockOpfsFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 10000,
      }),
    };

    vi.mocked(opfsUtils.walkOpfsDirectory).mockResolvedValue([
      {
        handle: mockOpfsFileHandle as any,
        path: ["test.md"],
      },
    ]);

    // Local file is slightly OLDER but within 2s skew
    const mockSkewedLocalFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 9500, // 500ms difference, well within 2s skew
      }),
    };

    vi.mocked(vaultIoUtils.reResolveFileHandle).mockResolvedValue(
      mockSkewedLocalFileHandle as any,
    );

    await syncToLocal(activeVaultId, {} as any, updateStatus);

    // Should SKIP write because it's within skew
    expect(vaultIoUtils.writeWithRetry).not.toHaveBeenCalled();
  });

  it("should only import files from local system if they are newer or different size", async () => {
    const activeVaultId = "test-vault";
    const mockVaultHandle = {
      getDirectoryHandle: vi.fn(),
      getFileHandle: vi.fn(),
    } as any;

    const mockLocalFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 20000,
        text: vi.fn().mockResolvedValue("local content"),
      }),
    };

    const mockLocalHandleWithEntries = {
      entries: async function* () {
        yield [
          "test.md",
          {
            kind: "file",
            ...mockLocalFileHandle,
          },
        ];
      },
    } as any;

    if (typeof window !== "undefined") {
      (window as any).showDirectoryPicker = vi
        .fn()
        .mockResolvedValue(mockLocalHandleWithEntries);
    } else {
      (global as any).window.showDirectoryPicker = vi
        .fn()
        .mockResolvedValue(mockLocalHandleWithEntries);
    }

    // Scenario 1: Local file is SAME as OPFS
    mockVaultHandle.getFileHandle.mockResolvedValue({
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 20000,
      }),
    });

    const result = await importFromFolder(activeVaultId, mockVaultHandle);

    expect(result.success).toBe(true);
    // successCount should be 0 because it was skipped
    expect(result.count).toBe(0);
    expect(opfsUtils.writeOpfsFile).not.toHaveBeenCalled();

    // Scenario 2: Local file is NEWER than OPFS
    vi.mocked(opfsUtils.writeOpfsFile).mockClear();
    mockVaultHandle.getFileHandle.mockResolvedValue({
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 10000, // Older than 20000
      }),
    });

    const result2 = await importFromFolder(activeVaultId, mockVaultHandle);
    expect(result2.count).toBe(1);
    expect(opfsUtils.writeOpfsFile).toHaveBeenCalled();
  });

  it("should use getDirHandle and handle nested paths when importing from a folder", async () => {
    const activeVaultId = "test-vault";
    const mockVaultHandle = {} as any;

    const mockLocalFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 50,
        lastModified: 30000,
        text: vi.fn().mockResolvedValue("nested local content"),
      }),
    };

    const mockSubdirHandle = {
      entries: async function* () {
        yield [
          "test.md",
          {
            kind: "file",
            ...mockLocalFileHandle,
          },
        ];
      },
    } as any;

    const mockLocalHandleWithSubdir = {
      entries: async function* () {
        yield [
          "subdir",
          {
            kind: "directory",
            ...mockSubdirHandle,
          },
        ];
      },
    } as any;

    if (typeof window !== "undefined") {
      (window as any).showDirectoryPicker = vi
        .fn()
        .mockResolvedValue(mockLocalHandleWithSubdir);
    } else {
      (global as any).window.showDirectoryPicker = vi
        .fn()
        .mockResolvedValue(mockLocalHandleWithSubdir);
    }

    const mockOpfsDirHandle = {
      getFileHandle: vi.fn().mockRejectedValue({ name: "NotFoundError" }),
    } as any;

    vi.mocked(opfsUtils.getDirHandle).mockResolvedValue(mockOpfsDirHandle);
    vi.mocked(opfsUtils.writeOpfsFile).mockResolvedValue(undefined as any);

    const result = await importFromFolder(activeVaultId, mockVaultHandle);

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(opfsUtils.getDirHandle).toHaveBeenCalled();
    expect(opfsUtils.getDirHandle).toHaveBeenCalledWith(
      mockVaultHandle,
      ["subdir"],
      false,
    );
  });
});
