import { describe, expect, it, vi } from "vitest";
import { FileManager, MAX_VAULT_FILE_SIZE_BYTES } from "./file-manager";

describe("FileManager", () => {
  const vaultHandle = { name: "vault-1" } as FileSystemDirectoryHandle;

  it("stores an accepted file under a collision-safe vault path", async () => {
    const writeOpfsFile = vi.fn().mockResolvedValue(undefined);
    const manager = new FileManager({
      ioAdapter: { writeOpfsFile },
      idGenerator: { uuid: () => "fixed-id" },
    });
    const file = new File(["map"], "The Map!.png", { type: "image/png" });

    await expect(manager.importFile(vaultHandle, file)).resolves.toEqual({
      ok: true,
      file: {
        path: "files/fixed-id-The-Map-.png",
        name: "The Map!.png",
        mimeType: "image/png",
        size: 3,
      },
    });
    expect(writeOpfsFile).toHaveBeenCalledWith(
      ["files", "fixed-id-The-Map-.png"],
      file,
      vaultHandle,
      "vault-1",
    );
  });

  it.each([
    [new File([], "empty.txt"), "empty"],
    [
      new File([new Uint8Array(MAX_VAULT_FILE_SIZE_BYTES + 1)], "large.bin"),
      "too_large",
    ],
  ] as const)("rejects %s without writing it", async (file, reason) => {
    const writeOpfsFile = vi.fn();
    const manager = new FileManager({ ioAdapter: { writeOpfsFile } });

    await expect(manager.importFile(vaultHandle, file)).resolves.toEqual({
      ok: false,
      reason,
    });
    expect(writeOpfsFile).not.toHaveBeenCalled();
  });

  it("reports unavailable vaults and write failures without creating metadata", async () => {
    const writeOpfsFile = vi.fn().mockRejectedValue(new Error("quota"));
    const manager = new FileManager({ ioAdapter: { writeOpfsFile } });
    const file = new File(["notes"], "notes.txt");

    await expect(manager.importFile(undefined, file)).resolves.toEqual({
      ok: false,
      reason: "vault_unavailable",
    });
    await expect(manager.importFile(vaultHandle, file)).resolves.toEqual({
      ok: false,
      reason: "write_failed",
    });
  });
});
