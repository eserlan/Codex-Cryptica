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
});
