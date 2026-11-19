import { describe, expect, it } from "vitest";
import {
  fetchCloudBackupRestorePoints,
  rollBackCloudBackup,
} from "./backup-rollback";
import { enabled, makeRuntime } from "./test-helpers";

const POINT = { date: "2026-11-01", revision: 4, entityCount: 9 };
const COUNTS = { changed: 2, returning: 1, trashed: 3 };

describe("fetchCloudBackupRestorePoints", () => {
  it("parses the list and calls the restore-points route", async () => {
    const h = await enabled({
      ok: true,
      status: 200,
      body: { restorePoints: [POINT] },
    });
    expect(await fetchCloudBackupRestorePoints(h.runtime, "v-1")).toEqual({
      kind: "points",
      points: [POINT],
    });
    expect(h.calls[0].url).toBe(
      "https://worker.test/api/cloud-backup/b-1/restore-points",
    );
  });

  it("maps 404 and a malformed body to unsupported", async () => {
    const missing = await enabled({ ok: false, status: 404, body: null });
    expect(await fetchCloudBackupRestorePoints(missing.runtime, "v-1")).toEqual(
      { kind: "unsupported" },
    );
    const bad = await enabled({ ok: true, status: 200, body: { x: 1 } });
    expect(await fetchCloudBackupRestorePoints(bad.runtime, "v-1")).toEqual({
      kind: "unsupported",
    });
  });

  it("reports off without a backup and failed on a network error", async () => {
    const none = makeRuntime();
    expect(await fetchCloudBackupRestorePoints(none.runtime, "v-1")).toEqual({
      kind: "off",
    });
    const h = await enabled();
    h.runtime.fetch = (async () => {
      throw new Error("offline");
    }) as never;
    expect(await fetchCloudBackupRestorePoints(h.runtime, "v-1")).toEqual({
      kind: "failed",
      error: "offline",
    });
  });
});

describe("rollBackCloudBackup", () => {
  it("sends a dry run and reads the preview", async () => {
    const h = await enabled({
      ok: true,
      status: 200,
      body: { preview: { date: POINT.date, revision: 7, ...COUNTS } },
    });
    expect(
      await rollBackCloudBackup(h.runtime, "v-1", {
        date: POINT.date,
        dryRun: true,
      }),
    ).toEqual({ kind: "preview", date: POINT.date, revision: 7, ...COUNTS });
    expect(h.calls[0].url).toBe(
      "https://worker.test/api/cloud-backup/b-1/rollback",
    );
    expect(h.calls[0].init.method).toBe("POST");
    expect(JSON.parse(h.calls[0].init.body)).toEqual({
      date: POINT.date,
      dryRun: true,
    });
  });

  it("commits with the base revision and reads the counts", async () => {
    const h = await enabled({
      ok: true,
      status: 200,
      body: { manifest: {}, rollback: COUNTS },
    });
    expect(
      await rollBackCloudBackup(h.runtime, "v-1", {
        date: POINT.date,
        baseRevision: 7,
      }),
    ).toEqual({ kind: "rolledBack", counts: COUNTS });
    expect(JSON.parse(h.calls[0].init.body).baseRevision).toBe(7);
  });

  it("maps 409 to changed", async () => {
    const h = await enabled({ ok: false, status: 409, body: null });
    expect(
      await rollBackCloudBackup(h.runtime, "v-1", { date: POINT.date }),
    ).toEqual({ kind: "changed" });
  });

  it("maps a missing point to gone and any other 404 to unsupported", async () => {
    const gone = await enabled({
      ok: false,
      status: 404,
      body: { error: { code: "restore_point_not_found" } },
    });
    expect(
      await rollBackCloudBackup(gone.runtime, "v-1", { date: POINT.date }),
    ).toEqual({ kind: "gone" });
    const old = await enabled({ ok: false, status: 404, body: null });
    expect(
      await rollBackCloudBackup(old.runtime, "v-1", { date: POINT.date }),
    ).toEqual({ kind: "unsupported" });
  });

  it("fails on a server error, a malformed body and a network error", async () => {
    const server = await enabled({ ok: false, status: 500, body: null });
    expect(
      await rollBackCloudBackup(server.runtime, "v-1", { date: POINT.date }),
    ).toMatchObject({ kind: "failed" });
    const bad = await enabled({ ok: true, status: 200, body: { nope: 1 } });
    expect(
      await rollBackCloudBackup(bad.runtime, "v-1", {
        date: POINT.date,
        dryRun: true,
      }),
    ).toMatchObject({ kind: "failed" });
    const net = await enabled();
    net.runtime.fetch = (async () => {
      throw new Error("offline");
    }) as never;
    expect(
      await rollBackCloudBackup(net.runtime, "v-1", { date: POINT.date }),
    ).toEqual({ kind: "failed", error: "offline" });
  });

  it("propagates trashEvicted on preview and rolledBack when present and omits when absent", async () => {
    const evicted = { evictedCount: 3, usedBytes: 900, maxBytes: 1000 };
    const prev = await enabled({
      ok: true,
      status: 200,
      body: {
        preview: {
          date: POINT.date,
          revision: 7,
          ...COUNTS,
          trashEvicted: evicted,
        },
      },
    });
    expect(
      await rollBackCloudBackup(prev.runtime, "v-1", {
        date: POINT.date,
        dryRun: true,
      }),
    ).toEqual({
      kind: "preview",
      date: POINT.date,
      revision: 7,
      ...COUNTS,
      trashEvicted: evicted,
    });

    const done = await enabled({
      ok: true,
      status: 200,
      body: { manifest: {}, rollback: COUNTS, trashEvicted: evicted },
    });
    expect(
      await rollBackCloudBackup(done.runtime, "v-1", {
        date: POINT.date,
        baseRevision: 7,
      }),
    ).toEqual({
      kind: "rolledBack",
      counts: COUNTS,
      trashEvicted: evicted,
    });
  });
});
