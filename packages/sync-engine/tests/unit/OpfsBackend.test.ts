import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpfsBackend } from "../../src/OpfsBackend";
import { SyncRegistry } from "../../src/SyncRegistry";

function makeBlob(content: string, lastModified: number): Blob {
  const blob = new Blob([content]);
  Object.defineProperty(blob, "lastModified", {
    value: lastModified,
    configurable: true,
  });
  return blob;
}

describe("OpfsBackend", () => {
  let registry: SyncRegistry;

  beforeEach(() => {
    registry = {
      getOpfsStatesByVault: vi.fn().mockResolvedValue([]),
      putOpfsStates: vi.fn(),
    } as any;
  });

  it("reuses cached hashes when file metadata is unchanged", async () => {
    const alpha = makeBlob("alpha", 100);
    vi.mocked(registry.getOpfsStatesByVault).mockResolvedValue([
      {
        vaultId: "vault-1",
        filePath: "notes/alpha.md",
        hash: "cached-hash",
        size: alpha.size,
        lastModified: 100,
      },
    ]);

    const digestSpy = vi.spyOn(crypto.subtle, "digest");
    const backend = new OpfsBackend(
      {
        [Symbol.asyncIterator]: async function* () {
          yield [
            "notes",
            {
              kind: "directory",
              [Symbol.asyncIterator]: async function* () {
                yield [
                  "alpha.md",
                  {
                    kind: "file",
                    getFile: async () => alpha,
                  },
                ];
              },
            },
          ];
        },
      } as any,
      registry,
    );

    const result = await backend.scan("vault-1");

    expect(result.files).toEqual([
      expect.objectContaining({
        path: "notes/alpha.md",
        hash: "cached-hash",
        size: alpha.size,
        lastModified: 100,
      }),
    ]);
    expect(digestSpy).not.toHaveBeenCalled();
    expect(registry.putOpfsStates).not.toHaveBeenCalled();
  });

  it("hashes files and refreshes the cache when metadata changes", async () => {
    const beta = makeBlob("beta", 200);
    const digestSpy = vi.spyOn(crypto.subtle, "digest");

    const backend = new OpfsBackend(
      {
        [Symbol.asyncIterator]: async function* () {
          yield [
            "beta.json",
            {
              kind: "file",
              getFile: async () => beta,
            },
          ];
        },
      } as any,
      registry,
    );

    const result = await backend.scan("vault-1");

    expect(result.files[0]).toEqual(
      expect.objectContaining({
        path: "beta.json",
        size: beta.size,
        lastModified: 200,
      }),
    );
    expect(result.files[0]?.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(digestSpy).toHaveBeenCalledTimes(1);
    expect(registry.putOpfsStates).toHaveBeenCalledWith([
      expect.objectContaining({
        vaultId: "vault-1",
        filePath: "beta.json",
        size: beta.size,
        lastModified: 200,
      }),
    ]);
  });

  it("handles NotFoundError gracefully during scan", async () => {
    const backend = new OpfsBackend(
      {
        [Symbol.asyncIterator]: async function* () {
          const entry = {
            kind: "file",
            getFile: async () => {
              const err = new Error("Not Found");
              err.name = "NotFoundError";
              throw err;
            },
          };
          yield ["ghost.md", entry];
        },
      } as any,
      registry,
    );

    const result = await backend.scan("vault-1");
    expect(result.files).toHaveLength(0);
  });

  it("uploads a file correctly with directory creation", async () => {
    const mockFileHandle = {
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      getFile: vi.fn().mockResolvedValue(makeBlob("new content", 300)),
    };

    const mockDirHandle = {
      getDirectoryHandle: vi.fn().mockReturnThis(),
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    };

    const backend = new OpfsBackend(mockDirHandle as any, registry);
    const content = new Blob(["new content"]);
    const result = await backend.upload("path/to/file.md", content);

    expect(mockDirHandle.getDirectoryHandle).toHaveBeenCalledWith("path", {
      create: true,
    });
    expect(mockDirHandle.getDirectoryHandle).toHaveBeenCalledWith("to", {
      create: true,
    });
    expect(mockFileHandle.createWritable).toHaveBeenCalled();
    expect(result.path).toBe("path/to/file.md");
  });

  it("downloads a file correctly", async () => {
    const blob = makeBlob("content", 400);
    const mockFileHandle = {
      getFile: vi.fn().mockResolvedValue(blob),
    };

    const mockDirHandle = {
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    };

    const backend = new OpfsBackend(mockDirHandle as any, registry);
    const result = await backend.download("file.md");

    expect(result).toBe(blob);
    expect(mockDirHandle.getFileHandle).toHaveBeenCalledWith("file.md", {
      create: false,
    });
  });

  it("deletes a file correctly", async () => {
    const mockDirHandle = {
      getDirectoryHandle: vi.fn().mockReturnThis(),
      removeEntry: vi.fn().mockResolvedValue(undefined),
    };

    const backend = new OpfsBackend(mockDirHandle as any, registry);
    await backend.delete("path/to/file.md");

    expect(mockDirHandle.getDirectoryHandle).toHaveBeenCalledWith("path");
    expect(mockDirHandle.getDirectoryHandle).toHaveBeenCalledWith("to");
    expect(mockDirHandle.removeEntry).toHaveBeenCalledWith("file.md", {
      recursive: true,
    });
  });
});
