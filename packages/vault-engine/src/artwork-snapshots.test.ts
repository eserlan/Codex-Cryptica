import { describe, expect, it, vi } from "vitest";
import { ArtworkSnapshotFiles } from "./artwork-snapshots";
describe("snapshot files", () => {
  it("refuses an existing name without writing or deleting it", async () => {
    const write = vi.fn();
    const files = new ArtworkSnapshotFiles({
      lock: async (_key, action) => action(),
      exists: async () => true,
      write,
      read: vi.fn(),
      remove: vi.fn(),
    });
    await expect(
      files.writeNew("images/artwork_same.png", new Blob(["a"])),
    ).rejects.toThrow("exists");
    expect(write).not.toHaveBeenCalled();
  });
  it("writes under a shared lock and rejects unsafe paths", async () => {
    const write = vi.fn(async () => {});
    const lock = vi.fn(async (_key, action) => action());
    const files = new ArtworkSnapshotFiles({
      lock,
      exists: async () => false,
      write,
      read: vi.fn(),
      remove: vi.fn(),
    });
    await files.writeNew("images/artwork_new.png", new Blob(["a"]));
    expect(lock).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledOnce();
    await expect(files.writeNew("../bad", new Blob(["a"]))).rejects.toThrow(
      "path",
    );
  });
  it("cleans up a partial new file when its write fails", async () => {
    const error = new Error("write failed");
    const remove = vi.fn(async () => {});
    const files = new ArtworkSnapshotFiles({
      lock: async (_key, action) => action(),
      exists: async () => false,
      write: async () => {
        throw error;
      },
      read: vi.fn(),
      remove,
    });
    await expect(
      files.writeNew("images/artwork_new.png", new Blob(["a"])),
    ).rejects.toBe(error);
    expect(remove).toHaveBeenCalledWith("images/artwork_new.png");
  });
});

it("adapts Vault IO without treating permission errors as missing files", async () => {
  const { createArtworkSnapshotFiles } = await import("./artwork-snapshots");
  const denied = new Error("denied");
  const writeOpfsFile = vi.fn();
  const io = {
    readOpfsBlob: vi.fn(async () => {
      throw denied;
    }),
    writeOpfsFile,
    isNotFoundError: () => false,
  };
  const files = createArtworkSnapshotFiles(
    io as never,
    {} as FileSystemDirectoryHandle,
    "vault1",
    async (_key, action) => action(),
  );
  await expect(
    files.writeNew("images/artwork_test.png", new Blob(["a"])),
  ).rejects.toBe(denied);
  expect(writeOpfsFile).not.toHaveBeenCalled();
});

it("writes a missing snapshot through the Vault adapter", async () => {
  const { createArtworkSnapshotFiles } = await import("./artwork-snapshots");
  const missing = new Error("missing");
  const writeOpfsFile = vi.fn(async () => {});
  const io = {
    readOpfsBlob: vi.fn(async () => {
      throw missing;
    }),
    writeOpfsFile,
    isNotFoundError: (error: unknown) => error === missing,
  };
  const root = {} as FileSystemDirectoryHandle;
  const files = createArtworkSnapshotFiles(
    io as never,
    root,
    "vault1",
    async (_key, action) => action(),
  );
  const blob = new Blob(["a"]);
  await files.writeNew("images/artwork_test.png", blob);
  expect(writeOpfsFile).toHaveBeenCalledWith(
    ["images", "artwork_test.png"],
    blob,
    root,
    "vault1",
  );
});
