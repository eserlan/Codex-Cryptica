import { describe, expect, it } from "vitest";
import {
  fetchCloudBackupTrash,
  fetchCloudBackupTrashItem,
} from "./backup-trash";
import { enabled, makeRuntime } from "./test-helpers";

const ITEM = {
  id: "a",
  title: "A",
  deletedBy: "Mara",
  deletedAt: "2026-09-01T00:00:00.000Z",
  restorable: true,
};
const TOMB = {
  id: "a",
  rev: 3,
  deletedBy: "Mara",
  deletedAt: "2026-09-01T00:00:00.000Z",
  title: "A",
};

describe("fetchCloudBackupTrash", () => {
  it("parses the list and calls the trash route", async () => {
    const h = await enabled({
      ok: true,
      status: 200,
      body: { revision: 4, items: [ITEM] },
    });
    expect(await fetchCloudBackupTrash(h.runtime, "v-1")).toEqual({
      kind: "items",
      revision: 4,
      // An older worker sends no kind, which reads as an entity.
      items: [{ ...ITEM, kind: "entity" }],
    });
    expect(h.calls[0].url).toBe(
      "https://worker.test/api/cloud-backup/b-1/trash",
    );
  });

  it("reads a map's kind and the files its trash content kept", async () => {
    const list = await enabled({
      ok: true,
      status: 200,
      body: { revision: 4, items: [{ ...ITEM, kind: "map" }] },
    });
    expect(await fetchCloudBackupTrash(list.runtime, "v-1")).toMatchObject({
      items: [{ kind: "map" }],
    });
    const assets = [
      { path: "maps/a.png", assetId: "a--1", mimeType: "image/png" },
    ];
    const item = await enabled({
      ok: true,
      status: 200,
      body: {
        tombstone: { ...TOMB, kind: "map" },
        entity: { id: "a", name: "A" },
        assets,
      },
    });
    expect(
      await fetchCloudBackupTrashItem(item.runtime, "v-1", "a"),
    ).toMatchObject({
      kind: "entity",
      entity: { id: "a", name: "A" },
      assets,
    });
  });

  it("maps 404 to unsupported and a malformed body to unsupported", async () => {
    const missing = await enabled({ ok: false, status: 404, body: null });
    expect(await fetchCloudBackupTrash(missing.runtime, "v-1")).toEqual({
      kind: "unsupported",
    });
    const bad = await enabled({ ok: true, status: 200, body: { items: 1 } });
    expect(await fetchCloudBackupTrash(bad.runtime, "v-1")).toEqual({
      kind: "unsupported",
    });
  });

  it("reports off without a backup and failed on a server error", async () => {
    const none = makeRuntime();
    expect(await fetchCloudBackupTrash(none.runtime, "v-1")).toEqual({
      kind: "off",
    });
    const h = await enabled({ ok: false, status: 500, body: null });
    expect(await fetchCloudBackupTrash(h.runtime, "v-1")).toMatchObject({
      kind: "failed",
      status: 500,
    });
  });

  it("parses usedBytes and maxBytes when present and succeeds when omitted", async () => {
    const withUsage = await enabled({
      ok: true,
      status: 200,
      body: { revision: 2, items: [], usedBytes: 1024, maxBytes: 52428800 },
    });
    expect(await fetchCloudBackupTrash(withUsage.runtime, "v-1")).toEqual({
      kind: "items",
      revision: 2,
      items: [],
      usedBytes: 1024,
      maxBytes: 52428800,
    });

    const older = await enabled({
      ok: true,
      status: 200,
      body: { revision: 2, items: [] },
    });
    const olderOut = await fetchCloudBackupTrash(older.runtime, "v-1");
    expect(olderOut).toEqual({
      kind: "items",
      revision: 2,
      items: [],
    });
  });
});

describe("fetchCloudBackupTrashItem", () => {
  it("parses the kept entity and encodes the id", async () => {
    const h = await enabled({
      ok: true,
      status: 200,
      body: { tombstone: TOMB, entity: { id: "a b", title: "A", extra: 1 } },
    });
    const out = await fetchCloudBackupTrashItem(h.runtime, "v-1", "a b");
    expect(out).toMatchObject({
      kind: "entity",
      entity: { id: "a b", extra: 1 },
    });
    expect(h.calls[0].url).toMatch(/\/trash\/a%20b$/);
  });

  it("maps 410 to gone", async () => {
    const h = await enabled({ ok: false, status: 410, body: null });
    expect(await fetchCloudBackupTrashItem(h.runtime, "v-1", "a")).toEqual({
      kind: "gone",
    });
  });

  it("fails on a malformed body", async () => {
    const h = await enabled({ ok: true, status: 200, body: { entity: 1 } });
    expect(
      await fetchCloudBackupTrashItem(h.runtime, "v-1", "a"),
    ).toMatchObject({ kind: "failed" });
  });
});
