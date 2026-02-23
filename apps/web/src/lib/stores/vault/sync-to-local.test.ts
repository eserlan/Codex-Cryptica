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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should only sync files that have changed", async () => {
    const activeVaultId = "test-vault";
    const updateStatus = vi.fn();

    // Mock OPFS handles
    const mockOpfsFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 10000,
      }),
    };

    const mockVaultHandle = {} as any;
    const mockLocalHandle = {
      name: "Local Folder",
      queryPermission: vi.fn().mockResolvedValue("granted"),
    } as any;

    // Ensure getDB returns our mockLocalHandle
    vi.mocked(getDB).mockResolvedValue({
      get: vi.fn().mockResolvedValue(mockLocalHandle),
      put: vi.fn(),
    } as any);

    // Mock showDirectoryPicker just in case
    (global as any).window.showDirectoryPicker = vi
      .fn()
      .mockResolvedValue(mockLocalHandle);

    // Mock walkOpfsDirectory to return one file
    vi.mocked(opfsUtils.walkOpfsDirectory).mockResolvedValue([
      {
        handle: mockOpfsFileHandle as any,
        path: ["test.md"],
      },
    ]);

    // Scenario 1: Local file exists and is UP TO DATE
    const mockExistingLocalFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 11000, // Newer than OPFS
      }),
    };

    vi.mocked(vaultIoUtils.reResolveFileHandle)
      .mockResolvedValueOnce(mockExistingLocalFileHandle as any) // first call for existence check
      .mockResolvedValueOnce({} as any); // second call for write (should not happen in this case)

    await syncToLocal(activeVaultId, mockVaultHandle, updateStatus);

    // Verify: writeWithRetry should NOT be called
    expect(vaultIoUtils.writeWithRetry).not.toHaveBeenCalled();

    // Scenario 2: Local file exists but is OLDER
    vi.mocked(vaultIoUtils.writeWithRetry).mockClear();
    vi.mocked(vaultIoUtils.reResolveFileHandle).mockClear();
    vi.mocked(opfsUtils.walkOpfsDirectory).mockClear();

    mockOpfsFileHandle.getFile.mockResolvedValue({
      size: 100,
      lastModified: 20000, // Newer than local
    });

    const mockOldLocalFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        size: 100,
        lastModified: 10000, // Older
      }),
    };

    vi.mocked(opfsUtils.walkOpfsDirectory).mockResolvedValue([
      {
        handle: mockOpfsFileHandle as any,
        path: ["test.md"],
      },
    ]);

    vi.mocked(vaultIoUtils.reResolveFileHandle)
      .mockResolvedValueOnce(mockOldLocalFileHandle as any) // check
      .mockResolvedValueOnce({} as any); // write

    await syncToLocal(activeVaultId, mockVaultHandle, updateStatus);

    // Verify: writeWithRetry SHOULD be called
    expect(vaultIoUtils.writeWithRetry).toHaveBeenCalled();

    // Scenario 3: Local file exists but SIZE differs
    vi.mocked(vaultIoUtils.writeWithRetry).mockClear();
    vi.mocked(vaultIoUtils.reResolveFileHandle).mockClear();
    vi.mocked(opfsUtils.walkOpfsDirectory).mockClear();

    mockOpfsFileHandle.getFile.mockResolvedValue({
      size: 200, // Different size
      lastModified: 10000,
    });

    const mockDifferentSizeLocalFileHandle = {
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

    vi.mocked(vaultIoUtils.reResolveFileHandle)
      .mockResolvedValueOnce(mockDifferentSizeLocalFileHandle as any) // check
      .mockResolvedValueOnce({} as any); // write

    await syncToLocal(activeVaultId, mockVaultHandle, updateStatus);

    // Verify: writeWithRetry SHOULD be called
    expect(vaultIoUtils.writeWithRetry).toHaveBeenCalled();
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

    const mockLocalHandle = {
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

    (global as any).window.showDirectoryPicker = vi
      .fn()
      .mockResolvedValue(mockLocalHandle);

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
});
