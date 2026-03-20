import { describe, it, expect, vi, beforeEach } from "vitest";
import * as migration from "./migration";
import { createVaultDir, writeOpfsFile } from "../../utils/opfs";
import { getDB, getPersistedHandle } from "../../utils/idb";
import { walkDirectory } from "../../utils/fs";

vi.mock("../../utils/opfs", () => ({
  createVaultDir: vi.fn(),
  writeOpfsFile: vi.fn(),
  walkOpfsDirectory: vi.fn(),
  getOpfsRoot: vi.fn(),
}));

vi.mock("../../utils/idb", () => ({
  getDB: vi.fn(),
  getPersistedHandle: vi.fn(),
  clearPersistedHandle: vi.fn(),
}));

vi.mock("../../utils/fs", () => ({
  walkDirectory: vi.fn(),
}));

vi.mock("../debug.svelte", () => ({
  debugStore: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("Vault Migration", () => {
  let mockOpfsRoot: any;
  let mockDB: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpfsRoot = {
      getDirectoryHandle: vi.fn(),
      entries: async function* () {},
      removeEntry: vi.fn(),
      name: "root",
    };
    mockDB = {
      get: vi.fn(),
      put: vi.fn(),
    };
    vi.mocked(getDB).mockResolvedValue(mockDB);
  });

  describe("migrateStructure", () => {
    it("should return early if vaults directory already exists", async () => {
      mockOpfsRoot.getDirectoryHandle.mockResolvedValue({});
      await migration.migrateStructure(mockOpfsRoot);
      expect(mockOpfsRoot.getDirectoryHandle).toHaveBeenCalledWith("vaults");
      expect(vi.mocked(createVaultDir)).not.toHaveBeenCalled();
    });

    it("should migrate root files to default vault", async () => {
      mockOpfsRoot.getDirectoryHandle.mockRejectedValue({
        name: "NotFoundError",
      });
      mockOpfsRoot.entries = async function* () {
        yield [
          "test.md",
          {
            kind: "file",
            getFile: () =>
              Promise.resolve({ text: () => Promise.resolve("content") }),
          },
        ];
      };

      vi.mocked(createVaultDir).mockResolvedValue({ name: "default" } as any);

      await migration.migrateStructure(mockOpfsRoot);

      expect(writeOpfsFile).toHaveBeenCalledWith(
        ["test.md"],
        "content",
        expect.any(Object),
      );
      expect(mockOpfsRoot.removeEntry).toHaveBeenCalledWith("test.md");
      expect(mockDB.put).toHaveBeenCalledWith(
        "vaults",
        expect.objectContaining({ id: "default" }),
      );
    });
  });

  describe("checkForMigration", () => {
    it("should return required false if migration already complete", async () => {
      mockDB.get.mockResolvedValue(true);
      const result = await migration.checkForMigration();
      expect(result.required).toBe(false);
    });

    it("should return required true if persisted handle exists", async () => {
      mockDB.get.mockResolvedValue(false);
      vi.mocked(getPersistedHandle).mockResolvedValue({} as any);
      const result = await migration.checkForMigration();
      expect(result.required).toBe(true);
    });
  });

  describe("runMigration", () => {
    it("should copy files from legacy handle to OPFS", async () => {
      const mockLegacy = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
        getDirectoryHandle: vi
          .fn()
          .mockRejectedValue({ name: "NotFoundError" }),
      };
      const mockFiles = [
        {
          path: ["f1.md"],
          handle: {
            getFile: () =>
              Promise.resolve({ text: () => Promise.resolve("c1") }),
          },
        },
      ];
      vi.mocked(walkDirectory).mockResolvedValue(mockFiles as any);

      const onComplete = vi.fn();
      const updateStatus = vi.fn();

      await migration.runMigration(
        mockOpfsRoot,
        mockLegacy as any,
        false,
        onComplete,
        updateStatus,
      );

      expect(writeOpfsFile).toHaveBeenCalledWith(["f1.md"], "c1", mockOpfsRoot);
      expect(mockDB.put).toHaveBeenCalledWith(
        "settings",
        true,
        "opfsMigrationComplete",
      );
      expect(onComplete).toHaveBeenCalled();
    });

    it("should handle silent migration permission failure", async () => {
      const mockLegacy = {
        queryPermission: vi.fn().mockResolvedValue("prompt"),
      };
      const updateStatus = vi.fn();
      await migration.runMigration(
        mockOpfsRoot,
        mockLegacy as any,
        true,
        vi.fn(),
        updateStatus,
      );
      expect(updateStatus).not.toHaveBeenCalled();
    });

    it("should migrate images during runMigration", async () => {
      const mockOpfsImages = { name: "opfs-images" };
      mockOpfsRoot.getDirectoryHandle.mockResolvedValue(mockOpfsImages);

      const mockLegacyImages = {
        values: async function* () {
          yield {
            kind: "file",
            name: "i1.png",
            getFile: () =>
              Promise.resolve(Object.assign(new Blob([]), { name: "i1.png" })),
          };
        },
      };
      const mockLegacy = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
        getDirectoryHandle: vi.fn().mockResolvedValue(mockLegacyImages),
      };

      vi.mocked(walkDirectory).mockResolvedValue([]);
      await migration.runMigration(
        mockOpfsRoot,
        mockLegacy as any,
        false,
        vi.fn(),
        vi.fn(),
      );

      expect(writeOpfsFile).toHaveBeenCalledWith(
        ["i1.png"],
        expect.any(Blob),
        mockOpfsImages,
      );
    });

    it("should handle migration failure", async () => {
      const mockLegacy = {
        queryPermission: vi.fn().mockResolvedValue("granted"),
      };
      vi.mocked(walkDirectory).mockRejectedValue(new Error("Disk error"));
      const updateStatus = vi.fn();

      await migration.runMigration(
        mockOpfsRoot,
        mockLegacy as any,
        false,
        vi.fn(),
        updateStatus,
      );

      expect(updateStatus).toHaveBeenCalledWith(
        "error",
        expect.stringContaining("Disk error"),
      );
    });
  });
});
