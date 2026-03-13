import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteVaultDir, isNotFoundError } from "./opfs";

// Mock idb
vi.mock("./idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    transaction: vi.fn().mockReturnValue({
      store: {
        index: vi.fn().mockReturnValue({
          openCursor: vi.fn().mockResolvedValue(null),
        }),
      },
      done: Promise.resolve(),
    }),
  }),
}));

describe("opfs - deleteVaultDir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    // Should not throw
    await expect(
      deleteVaultDir(mockRoot as any, "non-existent-vault"),
    ).resolves.not.toThrow();
    expect(mockVaultsDir.removeEntry).toHaveBeenCalledWith(
      "non-existent-vault",
      { recursive: true },
    );
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

  it("should normalize vaultId before deletion", async () => {
    const mockVaultsDir = {
      removeEntry: vi.fn().mockResolvedValue(undefined),
    };
    const mockRoot = {
      getDirectoryHandle: vi.fn().mockResolvedValue(mockVaultsDir),
    };

    await deleteVaultDir(mockRoot as any, "  vault-with-spaces  ");

    // Should use trimmed ID
    expect(mockVaultsDir.removeEntry).toHaveBeenCalledWith(
      "vault-with-spaces",
      { recursive: true },
    );
  });
});

describe("opfs - isNotFoundError", () => {
  it("should identify various NotFoundError shapes", () => {
    expect(isNotFoundError({ name: "NotFoundError" })).toBe(true);
    expect(isNotFoundError({ code: 8 })).toBe(true);
    expect(isNotFoundError({ cause: { name: "NotFoundError" } })).toBe(true);
    expect(isNotFoundError(new Error("file not found"))).toBe(true);
    expect(isNotFoundError(new Error("other error"))).toBe(false);
    expect(isNotFoundError(null)).toBe(false);
  });
});
