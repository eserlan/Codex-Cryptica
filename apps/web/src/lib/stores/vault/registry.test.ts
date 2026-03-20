import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listVaults,
  createVault,
  renameVault,
  deleteVault,
  getVault,
  updateLastOpened,
} from "./registry";
import { getDB } from "../../utils/idb";
import * as opfs from "../../utils/opfs";
import { sanitizeId } from "../../utils/markdown";

// 1. Mock dependencies
vi.mock("../../utils/idb", () => ({
  getDB: vi.fn(),
}));

vi.mock("../../utils/opfs", () => ({
  createVaultDir: vi.fn().mockResolvedValue(undefined),
  deleteVaultDir: vi.fn().mockResolvedValue(undefined),
  getVaultDir: vi.fn(),
}));

vi.mock("../../utils/markdown", () => ({
  sanitizeId: vi.fn((name) => name.toLowerCase().replace(/\s+/g, "-")),
}));

describe("Vault Registry", () => {
  let mockDB: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDB = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
    };
    vi.mocked(getDB).mockResolvedValue(mockDB as any);
  });

  describe("listVaults", () => {
    it("should return sorted vaults from database", async () => {
      const vaults = [
        { id: "v1", lastOpenedAt: 100 },
        { id: "v2", lastOpenedAt: 200 },
      ];
      mockDB.getAll.mockResolvedValue(vaults);

      const result = await listVaults();

      expect(result).toEqual([
        { id: "v2", lastOpenedAt: 200 },
        { id: "v1", lastOpenedAt: 100 },
      ]);
      expect(mockDB.getAll).toHaveBeenCalledWith("vaults");
    });
  });

  describe("createVault", () => {
    it("should throw if opfsRoot is missing", async () => {
      await expect(createVault(null as any, "My Vault")).rejects.toThrow(
        "Storage not initialized",
      );
    });

    it("should create a new vault record and directory", async () => {
      const mockRoot = {} as FileSystemDirectoryHandle;
      const result = await createVault(mockRoot, "My Vault");

      expect(sanitizeId).toHaveBeenCalledWith("My Vault");
      expect(opfs.createVaultDir).toHaveBeenCalledWith(
        mockRoot,
        expect.stringContaining("my-vault-"),
      );
      expect(mockDB.put).toHaveBeenCalledWith(
        "vaults",
        expect.objectContaining({
          name: "My Vault",
          entityCount: 0,
          syncState: expect.objectContaining({ status: "idle" }),
        }),
      );
      expect(result.name).toBe("My Vault");
      expect(result.id).toMatch(/^my-vault-/);
    });

    it("should fallback to 'vault' if name sanitizes to empty", async () => {
      vi.mocked(sanitizeId).mockReturnValue("");
      const mockRoot = {} as FileSystemDirectoryHandle;
      const result = await createVault(mockRoot, "!!!");

      expect(result.id).toMatch(/^vault-/);
    });
  });

  describe("renameVault", () => {
    it("should update name if vault exists", async () => {
      const existing = { id: "v1", name: "Old" };
      mockDB.get.mockResolvedValue(existing);

      const result = await renameVault("v1", "New");

      expect(mockDB.put).toHaveBeenCalledWith("vaults", {
        id: "v1",
        name: "New",
      });
      expect(result?.name).toBe("New");
    });

    it("should return null if vault does not exist", async () => {
      mockDB.get.mockResolvedValue(null);
      const result = await renameVault("v1", "New");
      expect(result).toBeNull();
    });
  });

  describe("deleteVault", () => {
    it("should return early if opfsRoot is missing", async () => {
      await deleteVault(null as any, "v1");
      expect(opfs.deleteVaultDir).not.toHaveBeenCalled();
    });

    it("should delete directory and database record", async () => {
      const mockRoot = {} as FileSystemDirectoryHandle;
      await deleteVault(mockRoot, "v1");

      expect(opfs.deleteVaultDir).toHaveBeenCalledWith(mockRoot, "v1");
      expect(mockDB.delete).toHaveBeenCalledWith("vaults", "v1");
    });

    it("should throw localized error if deletion fails", async () => {
      const mockRoot = {} as FileSystemDirectoryHandle;
      vi.mocked(opfs.deleteVaultDir).mockRejectedValue(new Error("Locked"));

      await expect(deleteVault(mockRoot, "v1")).rejects.toThrow(
        "Filesystem lock prevented deletion. Please try again.",
      );
    });
  });

  describe("getVault", () => {
    it("should return vault from db", async () => {
      const vault = { id: "v1", name: "Test" };
      mockDB.get.mockResolvedValue(vault);

      const result = await getVault("v1");
      expect(result).toEqual(vault);
    });
  });

  describe("updateLastOpened", () => {
    it("should update timestamp if vault exists", async () => {
      const existing = { id: "v1", lastOpenedAt: 0 };
      mockDB.get.mockResolvedValue(existing);

      await updateLastOpened("v1");

      expect(mockDB.put).toHaveBeenCalledWith(
        "vaults",
        expect.objectContaining({
          id: "v1",
          lastOpenedAt: expect.any(Number),
        }),
      );
      expect(
        vi.mocked(mockDB.put).mock.calls[0][1].lastOpenedAt,
      ).toBeGreaterThan(0);
    });

    it("should do nothing if vault does not exist", async () => {
      mockDB.get.mockResolvedValue(null);
      await updateLastOpened("v1");
      expect(mockDB.put).not.toHaveBeenCalled();
    });
  });
});
