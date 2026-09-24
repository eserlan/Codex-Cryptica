import { beforeEach, describe, expect, it } from "vitest";
import {
  CloudBackupDirtyStore,
  idbDirtyStorage,
  memoryDirtyStorage,
} from "./cloud-backup-dirty";

const ids = (rows: { kind: string; id: string; deleted: boolean }[]) =>
  rows
    .map((row) => `${row.kind}:${row.id}${row.deleted ? ":deleted" : ""}`)
    .sort();

describe("CloudBackupDirtyStore", () => {
  let store: CloudBackupDirtyStore;

  beforeEach(() => {
    store = new CloudBackupDirtyStore(memoryDirtyStorage());
  });

  it("records entity, canvas and map changes per vault", async () => {
    await store.record("v1", { kind: "entity", ids: ["a", "b"] });
    await store.record("v1", { kind: "canvas", ids: ["c1"] });
    await store.record("v1", { kind: "maps" });
    await store.record("v2", { kind: "entity", ids: ["other"] });

    expect(ids(await store.snapshot("v1"))).toEqual([
      "canvas:c1",
      "entity:a",
      "entity:b",
      "maps:*",
    ]);
    expect(ids(await store.snapshot("v2"))).toEqual(["entity:other"]);
  });

  it("keeps a deletion as a tombstone, and a later save replaces it", async () => {
    await store.record("v1", { kind: "entity", ids: ["a"], deleted: true });
    expect(ids(await store.snapshot("v1"))).toEqual(["entity:a:deleted"]);

    await store.record("v1", { kind: "entity", ids: ["a"] });
    expect(ids(await store.snapshot("v1"))).toEqual(["entity:a"]);
  });

  it("requires a full upload for an undescribed change", async () => {
    await store.record("v1");
    expect(ids(await store.snapshot("v1"))).toEqual(["full:*"]);
  });

  it("clears only rows unchanged since the snapshot", async () => {
    await store.record("v1", { kind: "entity", ids: ["a", "b"] });
    const sent = await store.snapshot("v1");

    // "b" is edited again while the upload is in flight.
    await store.record("v1", { kind: "entity", ids: ["b"] });
    await store.clearSent(sent);

    expect(ids(await store.snapshot("v1"))).toEqual(["entity:b"]);
  });

  it("clears a whole vault without touching others", async () => {
    await store.record("v1", { kind: "entity", ids: ["a"] });
    await store.record("v2", { kind: "entity", ids: ["b"] });

    await store.clearVault("v1");

    expect(await store.snapshot("v1")).toEqual([]);
    expect(ids(await store.snapshot("v2"))).toEqual(["entity:b"]);
  });
});

describe("idbDirtyStorage", () => {
  it("persists rows in IndexedDB and lists them by vault", async () => {
    const store = new CloudBackupDirtyStore(idbDirtyStorage());
    await store.clearVault("idb-v1");
    await store.record("idb-v1", { kind: "entity", ids: ["x"] });

    const reopened = new CloudBackupDirtyStore(idbDirtyStorage());
    const rows = await reopened.snapshot("idb-v1");
    expect(ids(rows)).toEqual(["entity:x"]);

    await reopened.clearSent(rows);
    expect(await reopened.snapshot("idb-v1")).toEqual([]);
  });
});
