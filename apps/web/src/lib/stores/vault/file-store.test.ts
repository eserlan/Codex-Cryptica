import { describe, expect, it, vi } from "vitest";
import { FileStore } from "./file-store.svelte";

describe("FileStore", () => {
  it("imports through the active vault handle", async () => {
    const vaultHandle = { name: "active" } as FileSystemDirectoryHandle;
    const importFile = vi.fn().mockResolvedValue({ ok: true, file: {} });
    const store = new FileStore({
      fileManager: { importFile } as any,
      getActiveVaultHandle: vi.fn().mockResolvedValue(vaultHandle),
      isGuest: vi.fn().mockReturnValue(false),
    });
    const file = new File(["a"], "a.txt");

    await store.importFile(file);

    expect(importFile).toHaveBeenCalledWith(vaultHandle, file);
  });

  it("blocks guest sessions before attempting persistence", async () => {
    const importFile = vi.fn();
    const store = new FileStore({
      fileManager: { importFile } as any,
      getActiveVaultHandle: vi.fn(),
      isGuest: vi.fn().mockReturnValue(true),
    });

    await expect(store.importFile(new File(["a"], "a.txt"))).resolves.toEqual({
      ok: false,
      reason: "vault_unavailable",
    });
    expect(importFile).not.toHaveBeenCalled();
  });
});
