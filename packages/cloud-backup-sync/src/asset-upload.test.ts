import { describe, expect, it, vi } from "vitest";
import { ASSET_UPLOAD_CONCURRENCY, uploadSnapshotAssets } from "./asset-upload";
import { makeRuntime } from "./test-helpers";

const credentials = { backupId: "backup", ownerCode: "owner" };
const asset = {
  assetId: "a/b.png",
  bytes: new Uint8Array([1, 2]),
  mimeType: "",
};

describe("asset uploads", () => {
  it("encodes asset ids and sends raw bytes, authentication, MIME fallback and signal", async () => {
    const { runtime, calls } = makeRuntime();
    const signal = new AbortController().signal;
    expect(
      await uploadSnapshotAssets(runtime, credentials, [asset], undefined, {
        skip: new Set(),
        signal,
      }),
    ).toEqual({ ok: true, value: null });
    expect(calls).toEqual([
      {
        url: "https://worker.test/api/cloud-backup/backup/assets/a%2Fb.png",
        init: {
          method: "PUT",
          headers: {
            Authorization: "Bearer owner",
            "Content-Type": "application/octet-stream",
          },
          body: asset.bytes,
          signal,
        },
      },
    ]);
  });

  it("counts skipped assets in progress without uploading them", async () => {
    const { runtime, calls } = makeRuntime();
    const progress = vi.fn();
    await uploadSnapshotAssets(runtime, credentials, [asset], progress, {
      skip: new Set([asset.assetId]),
    });
    expect(calls).toEqual([]);
    expect(progress).toHaveBeenCalledExactlyOnceWith({ uploaded: 1, total: 1 });
  });

  it("bounds simultaneous PUT requests", async () => {
    const { runtime } = makeRuntime();
    let active = 0;
    let peak = 0;
    runtime.fetch = vi.fn(async () => {
      active++;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active--;
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    });
    const assets = Array.from(
      { length: ASSET_UPLOAD_CONCURRENCY * 2 + 1 },
      (_, index) => ({ ...asset, assetId: `${index}` }),
    );
    expect(await uploadSnapshotAssets(runtime, credentials, assets)).toEqual({
      ok: true,
      value: null,
    });
    expect(peak).toBe(ASSET_UPLOAD_CONCURRENCY);
    expect(runtime.fetch).toHaveBeenCalledTimes(assets.length);
  });

  it("stops picking up work after a failed PUT", async () => {
    const { runtime, calls } = makeRuntime([
      { ok: false, status: 413, body: { error: { message: "Too large" } } },
    ]);
    const assets = Array.from(
      { length: ASSET_UPLOAD_CONCURRENCY + 2 },
      (_, index) => ({ ...asset, assetId: `${index}` }),
    );
    const fetch = runtime.fetch;
    runtime.fetch = async (...args) => {
      const response = await fetch(...args);
      // Let the failure body finish decoding before other in-flight PUTs
      // settle; those workers must then stop without taking another asset.
      if (response.ok) await new Promise((resolve) => setTimeout(resolve, 0));
      return response;
    };
    const onProgress = vi.fn();
    expect(
      await uploadSnapshotAssets(runtime, credentials, assets, onProgress),
    ).toEqual({
      ok: false,
      error: "Too large",
      status: 413,
    });
    expect(calls).toHaveLength(ASSET_UPLOAD_CONCURRENCY);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("does not start PUTs when already cancelled", async () => {
    const { runtime, calls } = makeRuntime();
    const controller = new AbortController();
    controller.abort();
    await expect(
      uploadSnapshotAssets(runtime, credentials, [asset], undefined, {
        skip: new Set(),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(calls).toEqual([]);
  });

  it("propagates transport failures", async () => {
    const { runtime } = makeRuntime();
    runtime.fetch = vi.fn().mockRejectedValue(new Error("Offline"));
    await expect(
      uploadSnapshotAssets(runtime, credentials, [asset]),
    ).rejects.toThrow("Offline");
  });
});
