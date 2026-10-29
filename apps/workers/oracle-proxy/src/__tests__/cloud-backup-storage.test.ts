import { describe, expect, it, vi } from "vitest";
import {
  eraseBackupObjects,
  getAssetKey,
  getBackupPrefix,
  getBundleKey,
  getIndexKey,
  getManifestKey,
  getShardKey,
  jsonByteLength,
  listKeys,
  pruneAssets,
  readJson,
  readManifest,
  storedBytes,
  writeJson,
  writeManifest,
} from "../cloud-backup-storage";
import { Bucket } from "./r2-memory-bucket";

describe("cloud backup storage", () => {
  it("keeps all object keys within the backup layout", () => {
    expect(getBackupPrefix("b")).toBe("cloud-backup/b/");
    expect(getManifestKey("b")).toBe("cloud-backup/b/manifest.json");
    expect(getBundleKey("b")).toBe("cloud-backup/b/bundle.json");
    expect(getIndexKey("b")).toBe("cloud-backup/b/index.json");
    expect(getShardKey("b", "0a")).toBe("cloud-backup/b/entities/0a.json");
    expect(getAssetKey("b", "map.png")).toBe("cloud-backup/b/assets/map.png");
  });

  it("round trips JSON and preserves manifest metadata", async () => {
    const env = { BUCKET: new Bucket() };
    const value = { title: "海" };
    await writeJson(env, getBundleKey("b"), value);
    expect(await readJson(env, getBundleKey("b"))).toEqual(value);
    expect(jsonByteLength(value)).toBe(
      new TextEncoder().encode(JSON.stringify(value)).length,
    );
    expect(await storedBytes(env, "b")).toBe(jsonByteLength(value));
    expect(await readJson(env, "missing")).toBeNull();
    const manifest = {
      schemaVersion: 1 as const,
      backupId: "b",
      vaultTitle: "Vault",
      sizeBytes: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      lastPushedAt: "2026-01-01T00:00:00.000Z",
    };
    await writeManifest(env, "b", manifest, "hash");
    expect(await readManifest(env, "b")).toEqual({
      manifest,
      ownerCodeHash: "hash",
    });
    expect(env.BUCKET.store.get(getManifestKey("b"))?.customMetadata).toEqual({
      ownerCodeHash: "hash",
      vaultTitle: "Vault",
    });
  });

  it("tolerates missing, invalid and malformed manifests but propagates invalid bundle JSON", async () => {
    const env = { BUCKET: new Bucket() };
    expect(await readManifest({}, "b")).toBeNull();
    expect(await readManifest(env, "b")).toBeNull();
    for (const body of ["{", "{}", "null"]) {
      await env.BUCKET.put(getManifestKey("b"), body);
      expect(await readManifest(env, "b")).toBeNull();
    }
    await env.BUCKET.put(getBundleKey("b"), "{");
    await expect(readJson(env, getBundleKey("b"))).rejects.toThrow();
  });

  it("reads every listing page, including an empty intermediate page", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        objects: [{ key: "a", size: 2 }],
        truncated: true,
        cursor: "next",
      })
      .mockResolvedValueOnce({ objects: [], truncated: true, cursor: "last" })
      .mockResolvedValueOnce({ objects: [{ key: "b" }], truncated: false });
    expect(await listKeys({ BUCKET: { list } }, "prefix/")).toEqual(["a", "b"]);
    expect(list).toHaveBeenNthCalledWith(2, {
      prefix: "prefix/",
      cursor: "next",
    });
    list
      .mockResolvedValueOnce({
        objects: [{ size: 2 }],
        truncated: true,
        cursor: "next",
      })
      .mockResolvedValueOnce({ objects: [{ size: 3 }, {}], truncated: false });
    expect(await storedBytes({ BUCKET: { list } }, "b")).toBe(5);
  });

  it("prunes only unreferenced assets and erases only the selected backup", async () => {
    const env = { BUCKET: new Bucket() };
    for (const key of [
      getAssetKey("b", "keep"),
      getAssetKey("b", "old"),
      getBundleKey("b"),
      getAssetKey("other", "keep"),
    ])
      await env.BUCKET.put(key, "data");
    await pruneAssets(env, "b", new Set([getAssetKey("b", "keep")]));
    expect([...env.BUCKET.store.keys()]).toEqual([
      getAssetKey("b", "keep"),
      getBundleKey("b"),
      getAssetKey("other", "keep"),
    ]);
    await eraseBackupObjects(env, "b");
    expect([...env.BUCKET.store.keys()]).toEqual([
      getAssetKey("other", "keep"),
    ]);
    await eraseBackupObjects(env, "missing");
  });

  it("decodes raw object bodies when an R2 adapter has no text method", async () => {
    const get = vi
      .fn()
      .mockResolvedValue({ body: new TextEncoder().encode('{"ok":true}') });
    expect(await readJson({ BUCKET: { get } }, "key")).toEqual({ ok: true });
  });

  it("deletes each listed page in order and preserves destructive empty-page stopping", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        objects: [{ key: "old" }, { key: "keep" }],
        truncated: true,
        cursor: "next",
      })
      .mockResolvedValueOnce({ objects: [{ key: "last" }], truncated: false });
    const remove = vi.fn().mockResolvedValue(undefined);
    const env = { BUCKET: { list, delete: remove } };
    await pruneAssets(env, "b", new Set(["keep"]));
    expect(remove.mock.calls).toEqual([["old"], ["last"]]);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(
      list.mock.invocationCallOrder[1],
    );
    expect(list).toHaveBeenNthCalledWith(2, {
      prefix: "cloud-backup/b/assets/",
      cursor: "next",
    });
    list.mockClear().mockResolvedValueOnce({
      objects: [],
      truncated: true,
      cursor: "unused",
    });
    remove.mockClear();
    await eraseBackupObjects(env, "b");
    expect(list).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
  });
});
