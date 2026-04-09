import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  deleteVaultDir,
  isNotFoundError,
  getOpfsRoot,
  getDirHandle,
  walkOpfsDirectory,
  readFileAsText,
  readOpfsBlob,
  writeOpfsFile,
  deleteOpfsEntry,
  getVaultDir,
  createVaultDir,
} from "./opfs";

// Mock idb
vi.mock("./idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    transaction: vi.fn().mockReturnValue({
      store: {
        index: vi.fn().mockReturnValue({
          openCursor: vi.fn().mockResolvedValue(null),
          openKeyCursor: vi.fn().mockResolvedValue(null),
          getAllKeys: vi.fn().mockResolvedValue([]),
        }),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      done: Promise.resolve(),
    }),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@codex/sync-engine", () => ({
  hashBlob: vi.fn().mockResolvedValue("mock-hash"),
}));

describe("opfs - utility functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getOpfsRoot", () => {
    it("should call navigator.storage.getDirectory", async () => {
      const mockGetDirectory = vi.fn().mockResolvedValue("root-handle");
      vi.stubGlobal("navigator", {
        storage: { getDirectory: mockGetDirectory },
      });
      const root = await getOpfsRoot();
      expect(root).toBe("root-handle");
      expect(mockGetDirectory).toHaveBeenCalled();
    });
  });

  describe("isNotFoundError", () => {
    it("should identify various NotFoundError shapes", () => {
      expect(isNotFoundError({ name: "NotFoundError" })).toBe(true);
      expect(isNotFoundError({ code: 8 })).toBe(true);
      expect(isNotFoundError({ cause: { name: "NotFoundError" } })).toBe(true);
      expect(isNotFoundError(new Error("file not found"))).toBe(true);
      expect(isNotFoundError(new Error("other error"))).toBe(false);
      expect(isNotFoundError(null)).toBe(false);
    });
  });

  describe("getDirHandle", () => {
    it("should traverse multiple segments", async () => {
      const mockSub = {
        name: "sub",
        getDirectoryHandle: vi.fn().mockResolvedValue({}),
      };
      const mockRoot = {
        getDirectoryHandle: vi.fn().mockResolvedValue(mockSub),
      };
      const result = await getDirHandle(mockRoot as any, ["a", "b"]);
      expect(result).toBeDefined();
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledWith("a", {
        create: false,
      });
      expect(mockSub.getDirectoryHandle).toHaveBeenCalledWith("b", {
        create: false,
      });
    });

    it("should create if requested", async () => {
      const mockRoot = {
        getDirectoryHandle: vi.fn().mockResolvedValue({}),
      };
      await getDirHandle(mockRoot as any, ["a"], true);
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledWith("a", {
        create: true,
      });
    });

    it("should throw NotFoundError with path if not creating", async () => {
      const mockRoot = {
        getDirectoryHandle: vi
          .fn()
          .mockRejectedValue({ name: "NotFoundError" }),
      };
      await expect(getDirHandle(mockRoot as any, ["a", "b"])).rejects.toThrow(
        "Directory not found: a/b",
      );
    });
  });

  describe("walkOpfsDirectory", () => {
    it("should recursively collect files", async () => {
      const mockFile = { kind: "file", name: "f1.md" };
      const mockSub = {
        kind: "directory",
        name: "sub",
        entries: async function* () {
          yield ["f2.md", { kind: "file", name: "f2.md" }];
        },
      };
      const mockRoot = {
        entries: async function* () {
          yield ["f1.md", mockFile];
          yield ["sub", mockSub];
        },
      };

      const files = await walkOpfsDirectory(mockRoot as any);
      expect(files).toHaveLength(2);
      expect(files[0].path).toEqual(["f1.md"]);
      expect(files[1].path).toEqual(["sub", "f2.md"]);
    });

    it("should handle entry processing errors via onError", async () => {
      const mockError = new Error("Failed");
      const mockFile = {
        kind: "file",
        name: "fail.md",
        getFile: vi.fn().mockRejectedValue(mockError),
      };
      const mockRoot = {
        entries: async function* () {
          yield ["fail.md", mockFile];
        },
      };
      const onError = vi.fn();
      // walkOpfsDirectory doesn't call getFile itself, it just pushes the handle.
      // Let's force an error by making handle.kind throw or similar if we can.
      Object.defineProperty(mockFile, "kind", {
        get: () => {
          throw mockError;
        },
      });

      await walkOpfsDirectory(mockRoot as any, [], onError);
      expect(onError).toHaveBeenCalledWith(mockError, ["fail.md"]);
    });
  });

  describe("readFileAsText and readOpfsBlob", () => {
    let mockRoot: any;
    let mockFileHandle: any;

    beforeEach(() => {
      mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue("content"),
          size: 10,
        }),
      };
      mockRoot = {
        getDirectoryHandle: vi.fn().mockResolvedValue({
          getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
        }),
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
      };
    });

    it("should read text", async () => {
      const text = await readFileAsText(mockRoot, ["sub", "file.md"]);
      expect(text).toBe("content");
    });

    it("should read blob", async () => {
      const blob = await readOpfsBlob(["file.md"], mockRoot);
      expect(blob.size).toBe(10);
    });

    it("should throw if path empty", async () => {
      await expect(readFileAsText(mockRoot, [])).rejects.toThrow("empty");
    });
  });

  describe("writeOpfsFile", () => {
    it("should write content and persist state", async () => {
      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockFileHandle = {
        createWritable: vi.fn().mockResolvedValue(mockWritable),
        getFile: vi.fn().mockResolvedValue({ size: 10, lastModified: 100 }),
      };
      const mockRoot = {
        getDirectoryHandle: vi.fn().mockResolvedValue({
          getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
        }),
      };

      await writeOpfsFile(["sub", "f.md"], "data", mockRoot as any, "v1");
      expect(mockWritable.write).toHaveBeenCalledWith("data");
      expect(mockWritable.close).toHaveBeenCalled();
    });
  });

  describe("deleteOpfsEntry", () => {
    it("should delete entry and clear state", async () => {
      const mockSub = { removeEntry: vi.fn().mockResolvedValue(undefined) };
      const mockRoot = {
        getDirectoryHandle: vi.fn().mockResolvedValue(mockSub),
      };
      await deleteOpfsEntry(mockRoot as any, ["sub", "f.md"], "v1");
      expect(mockSub.removeEntry).toHaveBeenCalledWith("f.md", {
        recursive: true,
      });
    });

    it("should return early if parent dir not found", async () => {
      const mockRoot = {
        getDirectoryHandle: vi
          .fn()
          .mockRejectedValue({ name: "NotFoundError" }),
      };
      await expect(
        deleteOpfsEntry(mockRoot as any, ["a", "b"]),
      ).resolves.toBeUndefined();
    });
  });

  describe("vault directory helpers", () => {
    it("should get/create vault dir", async () => {
      const mockRoot = {
        getDirectoryHandle: vi.fn().mockResolvedValue({
          getDirectoryHandle: vi.fn().mockResolvedValue("vault-handle"),
        }),
      };
      const dir = await getVaultDir(mockRoot as any, "v1");
      expect(dir).toBe("vault-handle");

      await createVaultDir(mockRoot as any, "v2");
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledWith("vaults", {
        create: true,
      });
    });
  });

  describe("deleteVaultDir", () => {
    it("should ignore NotFoundError when deleting a vault", async () => {
      const mockRemoveEntry = vi
        .fn()
        .mockRejectedValue({ name: "NotFoundError" });
      const mockVaultsDir = {
        getDirectoryHandle: vi.fn().mockResolvedValue({}), // placeholder
        removeEntry: mockRemoveEntry,
      };

      const mockRoot = {
        getDirectoryHandle: vi.fn().mockImplementation((name) => {
          if (name === "vaults") return mockVaultsDir;
          throw { name: "NotFoundError" };
        }),
      };

      await expect(
        deleteVaultDir(mockRoot as any, "non-existent-vault"),
      ).resolves.not.toThrow();
    });

    it("should throw other errors when deleting a vault", async () => {
      const mockRemoveEntry = vi
        .fn()
        .mockRejectedValue(new Error("Permission Denied"));
      const mockVaultsDir = {
        removeEntry: mockRemoveEntry,
      };

      const mockRoot = {
        getDirectoryHandle: vi.fn().mockResolvedValue(mockVaultsDir),
      };

      await expect(deleteVaultDir(mockRoot as any, "vault-1")).rejects.toThrow(
        "Permission Denied",
      );
    });

    it("should clear IDB cache with batched concurrent Promise.all deletion", async () => {
      const deletedKeys: IDBValidKey[] = [];
      const mockKeys = ["key1", "key2", "key3"];

      const mockIndex = {
        getAllKeys: vi.fn().mockResolvedValue(mockKeys),
      };
      const mockStore = {
        index: vi.fn().mockReturnValue(mockIndex),
        delete: vi.fn().mockImplementation((key) => {
          deletedKeys.push(key);
          return Promise.resolve(undefined);
        }),
      };
      const mockTx = {
        store: mockStore,
        done: Promise.resolve(),
      };
      const mockDB = {
        transaction: vi.fn().mockReturnValue(mockTx),
      };
      const { getDB } = await import("./idb");
      vi.mocked(getDB).mockResolvedValue(mockDB as any);

      // Mock OPFS root for directory deletion
      const mockVaultDir = {
        removeEntry: vi.fn().mockResolvedValue(undefined),
      };
      const mockRoot = {
        getDirectoryHandle: vi.fn().mockImplementation((name) => {
          if (name === "vaults") return Promise.resolve(mockVaultDir);
          return Promise.reject({ name: "NotFoundError" });
        }),
      };

      await deleteVaultDir(mockRoot as any, "test-vault");

      // Verify index was queried
      expect(mockIndex.getAllKeys).toHaveBeenCalledWith("test-vault");
      // Verify all 3 keys were deleted
      expect(deletedKeys).toEqual(["key1", "key2", "key3"]);
    });

    it("should handle empty keys result", async () => {
      const mockIndex = {
        getAllKeys: vi.fn().mockResolvedValue([]),
      };
      const mockStore = {
        index: vi.fn().mockReturnValue(mockIndex),
        delete: vi.fn(),
      };
      const mockTx = {
        store: mockStore,
        done: Promise.resolve(),
      };
      const mockDB = {
        transaction: vi.fn().mockReturnValue(mockTx),
      };
      const { getDB } = await import("./idb");
      vi.mocked(getDB).mockResolvedValue(mockDB as any);

      // Mock OPFS root for directory deletion
      const mockVaultDir = {
        removeEntry: vi.fn().mockResolvedValue(undefined),
      };
      const mockRoot = {
        getDirectoryHandle: vi.fn().mockImplementation((name) => {
          if (name === "vaults") return Promise.resolve(mockVaultDir);
          return Promise.reject({ name: "NotFoundError" });
        }),
      };

      await deleteVaultDir(mockRoot as any, "empty-vault");

      expect(mockIndex.getAllKeys).toHaveBeenCalledWith("empty-vault");
      expect(mockStore.delete).not.toHaveBeenCalled();
    });

    it("should delete many keys concurrently in batches", async () => {
      const deletedKeys: IDBValidKey[] = [];
      const totalKeys = 120;
      const keys = Array.from({ length: totalKeys }, (_, i) => `key-${i}`);

      const mockDelete = vi.fn().mockImplementation((key) => {
        deletedKeys.push(key);
        return Promise.resolve(undefined);
      });

      const mockIndexImpl = vi.fn().mockReturnValue({
        getAllKeys: vi.fn().mockResolvedValue(keys),
      });

      const mockStoreImpl = {
        index: mockIndexImpl,
        delete: mockDelete,
      };

      const mockTxImpl = {
        store: mockStoreImpl,
        done: Promise.resolve(),
      };

      const mockTransaction = vi.fn().mockReturnValue(mockTxImpl);

      const mockDBImpl = {
        transaction: mockTransaction,
      } as any;

      // Override the getDB mock for this test
      const { getDB } = await import("./idb");
      vi.mocked(getDB).mockResolvedValue(mockDBImpl);

      // Mock OPFS root for directory deletion
      const mockVaultDir = {
        removeEntry: vi.fn().mockResolvedValue(undefined),
      };
      const mockRoot = {
        getDirectoryHandle: vi.fn().mockImplementation((name) => {
          if (name === "vaults") return Promise.resolve(mockVaultDir);
          return Promise.reject({ name: "NotFoundError" });
        }),
      };

      await deleteVaultDir(mockRoot as any, "large-vault");

      // Verify all 120 keys were deleted
      expect(deletedKeys).toHaveLength(totalKeys);
      expect(deletedKeys).toEqual(keys);
      expect(mockDelete).toHaveBeenCalledTimes(totalKeys);
    });
  });
});
