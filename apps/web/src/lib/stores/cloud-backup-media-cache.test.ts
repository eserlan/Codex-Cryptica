import { beforeEach, describe, expect, it, vi } from "vitest";
import { planAssetUploads } from "@codex/cloud-backup-sync";
import { CloudBackupMediaCache } from "./cloud-backup-media-cache";

vi.mock("@codex/cloud-backup-sync", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  planAssetUploads: vi.fn(),
}));

function harness() {
  const data = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
  };
  return { data, storage, cache: new CloudBackupMediaCache(() => storage) };
}

beforeEach(() => vi.clearAllMocks());
describe("backup media hash cache", () => {
  it("loads, saves and resets hashes separately for each vault", () => {
    const { cache, data } = harness();
    data.set("codex.cloud-backup-hashes.one", JSON.stringify({ a: "hash" }));
    cache.load("one");
    expect(cache.hashes).toEqual({ a: "hash" });
    cache.save("two");
    cache.reset("one");
    expect(cache.hashes).toEqual({});
    cache.load("two");
    expect(cache.hashes).toEqual({ a: "hash" });
    cache.load("absent");
    expect(cache.hashes).toEqual({});
  });

  it("tolerates invalid JSON and blocked storage", () => {
    const { cache, data, storage } = harness();
    data.set("codex.cloud-backup-hashes.one", "not json");
    cache.load("one");
    expect(cache.hashes).toEqual({});
    storage.getItem.mockImplementation(() => {
      throw new Error("Blocked");
    });
    cache.load("one");
    storage.setItem.mockImplementation(() => {
      throw new Error("Blocked");
    });
    expect(() => cache.save("one")).not.toThrow();
  });

  it("plans unchanged uploads and reports hash timing without content", async () => {
    const { cache } = harness();
    cache.hashes = { a: "old" };
    const assets = [
      { assetId: "a", bytes: new Uint8Array([1, 2]), mimeType: "image/png" },
    ];
    vi.mocked(planAssetUploads).mockResolvedValue({
      skippedIds: ["a"],
      toUpload: [],
      hashes: { a: "new" },
    });
    const timing = vi.fn();
    expect(await cache.planUploads(assets, timing)).toEqual({
      skipAssetUploadIds: ["a"],
      freshHashes: { a: "new" },
    });
    expect(planAssetUploads).toHaveBeenCalledWith(assets, { a: "old" });
    expect(timing).toHaveBeenCalledWith({
      stage: "hash",
      count: 1,
      bytes: 2,
      durationMs: expect.any(Number),
    });
  });

  it("uploads everything if hashing fails", async () => {
    vi.mocked(planAssetUploads).mockRejectedValueOnce(new Error("No crypto"));
    expect(await harness().cache.planUploads([])).toEqual({
      skipAssetUploadIds: [],
      freshHashes: {},
    });
  });
});
