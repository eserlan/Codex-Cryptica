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

  const withRevision = async (revision: number | undefined, ...then: any[]) => {
    const h = await enabled(...then);
    const record = (await getLocalCloudBackupRecord(h.runtime, "v-1"))!;
    await h.runtime.storage.write("v-1", { ...record, revision });
    return h;
  };

  it("sends and stores the revision", async () => {
    const { runtime, calls } = await withRevision(4, {
      ok: true,
      status: 200,
      body: { manifest: { ...MANIFEST, revision: 5 } },
    });
    await pushDeltaToCloudBackup(runtime, "v-1", delta, "base");
    expect(JSON.parse(calls[0].init.body)).toMatchObject({
      baseRevision: 4,
      baseLastPushedAt: "base",
    });
    expect((await getLocalCloudBackupRecord(runtime, "v-1"))?.revision).toBe(5);
  });

  it("falls back to the timestamp when the record has no revision", async () => {
    const { runtime, calls } = await withRevision(undefined);
    await pushDeltaToCloudBackup(runtime, "v-1", delta, "base");
    const body = JSON.parse(calls[0].init.body);
    expect(body).not.toHaveProperty("baseRevision");
    expect(body.baseLastPushedAt).toBe("base");
  });

  it("drops the stored revision when the worker returns none", async () => {
    const { runtime } = await withRevision(4);
    await pushDeltaToCloudBackup(runtime, "v-1", delta, "base");
    const record = await getLocalCloudBackupRecord(runtime, "v-1");
    expect(record).not.toHaveProperty("revision");
    expect(record?.lastPushedAt).toBe(MANIFEST.lastPushedAt);
  });

  it("reports a diverged answer as a conflict and keeps the revision", async () => {
    const { runtime } = await withRevision(4, {
      ok: false,
      status: 409,
      body: {
        error: {
          code: "diverged",
          lastPushedAt: "2026-09-01T00:00:00.000Z",
          revision: 7,
        },
      },
    });
    expect(
      await pushDeltaToCloudBackup(runtime, "v-1", delta, "base"),
    ).toMatchObject({
      ok: false,
      conflict: true,
      remoteLastPushedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(await getLocalCloudBackupRecord(runtime, "v-1")).toMatchObject({
      status: "error",
      revision: 4,
    });
  });
});
