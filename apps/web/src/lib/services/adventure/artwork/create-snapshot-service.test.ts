import { expect, it, vi } from "vitest";
import { createSnapshotService } from "./create-snapshot-service";
it("connects preservation to Vault IO with a vault-scoped lock", async () => {
  const missing = new Error("missing");
  let stored: Blob | null = null;
  const io = {
    readOpfsBlob: vi.fn(async () => {
      if (!stored) throw missing;
      return stored;
    }),
    writeOpfsFile: vi.fn(async (_path, blob) => {
      stored = blob;
    }),
    isNotFoundError: (error: unknown) => error === missing,
    deleteFile: vi.fn(),
  };
  const lock = vi.fn(async (_key, action) => action());
  const service = createSnapshotService({
    io: io as never,
    root: {} as FileSystemDirectoryHandle,
    vaultId: "v1",
    lock,
    id: () => "one",
    digest: async () => "a".repeat(64),
    dimensions: async () => ({ width: 1, height: 1 }),
  });
  const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
    type: "image/png",
  });
  expect((await service.preserve(png, new AbortController().signal)).path).toBe(
    "images/artwork_one.png",
  );
  expect(lock.mock.calls[0][0]).toContain("v1:");
});

it("does not overwrite an existing snapshot", async () => {
  const writeOpfsFile = vi.fn();
  const service = createSnapshotService({
    io: {
      readOpfsBlob: async () => new Blob(["existing"]),
      writeOpfsFile,
    } as never,
    root: {} as FileSystemDirectoryHandle,
    vaultId: "v1",
    lock: async (_key, action) => action(),
    id: () => "one",
    digest: async () => "a".repeat(64),
    dimensions: async () => ({ width: 1, height: 1 }),
  });
  const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
    type: "image/png",
  });
  await expect(
    service.preserve(png, new AbortController().signal),
  ).rejects.toThrow("exists");
  expect(writeOpfsFile).not.toHaveBeenCalled();
});
