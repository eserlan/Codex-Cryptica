import { beforeEach, describe, expect, it } from "vitest";
import {
  CloudBackupBaseStore,
  idbBaseStorage,
  memoryBaseStorage,
} from "./cloud-backup-base";

const ent = (id: string, content = "x") => ({ id, title: id, content });
const ids = async (store: CloudBackupBaseStore, vault: string) =>
  (await store.list(vault)).map((row) => row.id).sort();

describe("CloudBackupBaseStore", () => {
  let store: CloudBackupBaseStore;
  beforeEach(() => {
    store = new CloudBackupBaseStore(memoryBaseStorage());
  });

  it("stores an upsert and returns it", async () => {
    await store.recordSent("v1", [ent("a")], []);
    expect(await store.get("v1", "a")).toEqual(ent("a"));
    expect(await store.get("v1", "missing")).toBeUndefined();
  });

  it("keeps a copy that later edits cannot change", async () => {
    const a = ent("a");
    await store.recordSent("v1", [a], []);
    a.content = "edited";
    expect(await store.get("v1", "a")).toEqual(ent("a"));
  });

  it("drops the base of a deleted id", async () => {
    await store.recordSent("v1", [ent("a"), ent("b")], []);
    await store.recordSent("v1", [], ["a"]);
    expect(await ids(store, "v1")).toEqual(["b"]);
  });

  it("replaces a vault's bases and leaves other vaults alone", async () => {
    await store.recordSent("v1", [ent("a"), ent("b")], []);
    await store.recordSent("v2", [ent("z")], []);
    await store.replaceVault("v1", [ent("b", "new"), ent("c")]);
    expect(await ids(store, "v1")).toEqual(["b", "c"]);
    expect(await store.get("v1", "b")).toEqual(ent("b", "new"));
    expect(await ids(store, "v2")).toEqual(["z"]);
  });

  it("clears one vault only", async () => {
    await store.recordSent("v1", [ent("a")], []);
    await store.recordSent("v2", [ent("z")], []);
    await store.clearVault("v1");
    expect(await ids(store, "v1")).toEqual([]);
    expect(await ids(store, "v2")).toEqual(["z"]);
  });
});

describe("idbBaseStorage", () => {
  it("persists a base across store instances", async () => {
    const store = new CloudBackupBaseStore(idbBaseStorage());
    await store.clearVault("idb-v1");
    await store.recordSent("idb-v1", [ent("x")], []);

    const reopened = new CloudBackupBaseStore(idbBaseStorage());
    expect(await reopened.get("idb-v1", "x")).toEqual(ent("x"));

    await reopened.clearVault("idb-v1");
    expect(await reopened.list("idb-v1")).toEqual([]);
  });
});
