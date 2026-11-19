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

  it("sends the display name for an editor, trimmed and capped", async () => {
    const { runtime, calls } = await enabled();
    const record = await getLocalCloudBackupRecord(runtime, "v-1");
    await runtime.storage.write("v-1", { ...record, role: "editor" });
    runtime.deviceId = () => "device-12345678";
    runtime.displayName = () => `  ${"M".repeat(50)}  `;
    await pushDeltaToCloudBackup(runtime, "v-1", delta, "base");
    expect(JSON.parse(calls[0].init.body).editorName).toBe("M".repeat(40));
  });

  it("sends no name for an owner, or an editor without one", async () => {
    const { runtime, calls } = await enabled();
    runtime.displayName = () => "Mara";
    await pushDeltaToCloudBackup(runtime, "v-1", delta, "base");
    expect(JSON.parse(calls[0].init.body)).not.toHaveProperty("editorName");
    const record = await getLocalCloudBackupRecord(runtime, "v-1");
    await runtime.storage.write("v-1", { ...record, role: "editor" });
    runtime.deviceId = () => "device-12345678";
    runtime.displayName = () => "  ";
    await pushDeltaToCloudBackup(runtime, "v-1", delta, "base");
    expect(JSON.parse(calls[1].init.body)).not.toHaveProperty("editorName");
  });

  it("propagates valid trashEvicted and ignores absent or invalid trashEvicted", async () => {
    const evicted = { evictedCount: 2, usedBytes: 4000, maxBytes: 5000 };
    const withEviction = await enabled({
      ok: true,
      status: 200,
      body: {
        manifest: {
          schemaVersion: 2,
          backupId: "backup-1",
          vaultTitle: "V",
          sizeBytes: 10,
          createdAt: "2026-01-01T00:00:00.000Z",
          lastPushedAt: "2026-01-01T00:01:00.000Z",
          revision: 2,
        },
        trashEvicted: evicted,
      },
    });
    const out1 = await pushDeltaToCloudBackup(
      withEviction.runtime,
      "v-1",
      delta,
      "base",
    );
    expect(out1).toMatchObject({ ok: true, trashEvicted: evicted });

    const withInvalid = await enabled({
      ok: true,
      status: 200,
      body: {
        manifest: {
          schemaVersion: 2,
          backupId: "backup-1",
          vaultTitle: "V",
          sizeBytes: 10,
          createdAt: "2026-01-01T00:00:00.000Z",
          lastPushedAt: "2026-01-01T00:01:00.000Z",
          revision: 2,
        },
        trashEvicted: { evictedCount: 0 },
      },
    });
    const out2 = await pushDeltaToCloudBackup(
      withInvalid.runtime,
      "v-1",
      delta,
      "base",
    );
    expect(out2.ok).toBe(true);
    expect("trashEvicted" in out2).toBe(false);
  });
});
