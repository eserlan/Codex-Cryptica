import { describe, expect, it, vi } from "vitest";
import { pushDeltaToCloudBackup } from "./delta-sync";
import { getLocalCloudBackupRecord } from "./backup-records";
import { MANIFEST, enabled } from "./test-helpers";

const delta = {
  vaultTitle: "Renamed",
  upserts: [{ id: "entity" }],
  deletes: [],
  assetIds: [],
};

describe("delta sync", () => {
  it("updates the title and timestamp after a successful commit", async () => {
    const { runtime } = await enabled();
    expect(await pushDeltaToCloudBackup(runtime, "v-1", delta, "base")).toEqual(
      { ok: true, value: MANIFEST },
    );
    expect(await getLocalCloudBackupRecord(runtime, "v-1")).toMatchObject({
      status: "idle",
      vaultTitle: "Renamed",
      lastPushedAt: MANIFEST.lastPushedAt,
    });
  });

  it("restores the prior status when the worker requires a full snapshot", async () => {
    const { runtime } = await enabled({
      ok: false,
      status: 409,
      body: { error: { code: "full_push_required" } },
    });
    const before = await getLocalCloudBackupRecord(runtime, "v-1");
    expect(await pushDeltaToCloudBackup(runtime, "v-1", delta, "base")).toEqual(
      {
        ok: false,
        fullPushRequired: true,
        error: "A full upload is required.",
      },
    );
    expect(await getLocalCloudBackupRecord(runtime, "v-1")).toEqual(before);
  });

  it("marks malformed success responses as failures", async () => {
    const { runtime } = await enabled({ ok: true, status: 200, body: null });
    expect(await pushDeltaToCloudBackup(runtime, "v-1", delta, "base")).toEqual(
      {
        ok: false,
        error: "The backup service returned an unreadable response.",
      },
    );
    expect((await getLocalCloudBackupRecord(runtime, "v-1"))?.status).toBe(
      "error",
    );
  });

  it("restores the prior record when cancelled during body decoding", async () => {
    const { runtime } = await enabled();
    const before = await getLocalCloudBackupRecord(runtime, "v-1");
    const controller = new AbortController();
    runtime.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        controller.abort();
        return { manifest: MANIFEST };
      },
    });
    expect(
      await pushDeltaToCloudBackup(
        runtime,
        "v-1",
        delta,
        "base",
        controller.signal,
      ),
    ).toEqual({ ok: true, value: null });
    expect(await getLocalCloudBackupRecord(runtime, "v-1")).toEqual(before);
  });
});
