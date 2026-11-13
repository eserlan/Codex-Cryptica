import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadSnapshot } from "./snapshot-upload";
import { MANIFEST, PAYLOAD, makeRuntime } from "./test-helpers";

const credentials = { backupId: "backup", ownerCode: "owner" };
const asset = {
  assetId: "portrait.png",
  bytes: new Uint8Array([1, 2]),
  mimeType: "image/png",
};
afterEach(() => vi.restoreAllMocks());

describe("snapshot upload", () => {
  it("commits skipped media ids and measures serialization and the complete upload", async () => {
    const { runtime, calls } = makeRuntime();
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(20)
      .mockReturnValueOnce(30)
      .mockReturnValueOnce(50);
    const onTiming = vi.fn();
    const onProgress = vi.fn();
    expect(
      await uploadSnapshot(
        runtime,
        credentials,
        { ...PAYLOAD, assets: [asset] },
        onProgress,
        { skipAssetUploadIds: [asset.assetId], onTiming },
      ),
    ).toEqual({ ok: true, value: MANIFEST });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://worker.test/api/cloud-backup/backup/commit",
    );
    expect(JSON.parse(calls[0].init.body)).toEqual({
      ...PAYLOAD,
      assetIds: [asset.assetId],
    });
    const bytes = calls[0].init.body.length;
    expect(onTiming.mock.calls.map(([timing]) => timing)).toEqual([
      { stage: "serialize", durationMs: 10, bytes },
      {
        stage: "upload",
        durationMs: 40,
        count: 1,
        bytes: bytes + asset.bytes.length,
      },
    ]);
    expect(onProgress).toHaveBeenCalledExactlyOnceWith({
      uploaded: 1,
      total: 1,
    });
  });

  it("does not serialize or commit after an asset failure", async () => {
    const { runtime, calls } = makeRuntime([
      { ok: false, status: 503, body: null },
    ]);
    const onTiming = vi.fn();
    expect(
      await uploadSnapshot(
        runtime,
        credentials,
        { ...PAYLOAD, assets: [asset] },
        undefined,
        { onTiming },
      ),
    ).toEqual({ ok: false, error: "Request failed (503)", status: 503 });
    expect(calls).toHaveLength(1);
    expect(onTiming).not.toHaveBeenCalled();
  });

  it("reports failed commits after timing the upload", async () => {
    const { runtime } = makeRuntime([
      { ok: false, status: 413, body: { error: { message: "Too large" } } },
    ]);
    const onTiming = vi.fn();
    expect(
      await uploadSnapshot(runtime, credentials, PAYLOAD, undefined, {
        onTiming,
      }),
    ).toEqual({ ok: false, error: "Too large", status: 413 });
    expect(onTiming).toHaveBeenCalledTimes(2);
  });

  it.each([null, {}, { manifest: {} }])(
    "rejects an incomplete commit response: %j",
    async (body) => {
      const { runtime } = makeRuntime([{ ok: true, status: 200, body }]);
      expect(await uploadSnapshot(runtime, credentials, PAYLOAD)).toEqual({
        ok: false,
        error: "The backup service returned an unreadable response.",
      });
    },
  );

  it("rejects unreadable commit JSON", async () => {
    const { runtime } = makeRuntime();
    runtime.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });
    expect(await uploadSnapshot(runtime, credentials, PAYLOAD)).toEqual({
      ok: false,
      error: "The backup service returned an unreadable response.",
    });
  });

  it("stops after a cancelled commit without reporting upload timing", async () => {
    const { runtime } = makeRuntime();
    const controller = new AbortController();
    runtime.fetch = vi.fn(async () => {
      controller.abort();
      return {
        ok: true,
        status: 200,
        json: async () => ({ manifest: MANIFEST }),
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    });
    const onTiming = vi.fn();
    await expect(
      uploadSnapshot(runtime, credentials, PAYLOAD, undefined, {
        signal: controller.signal,
        onTiming,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(onTiming.mock.calls.map(([timing]) => timing.stage)).toEqual([
      "serialize",
    ]);
  });
});
