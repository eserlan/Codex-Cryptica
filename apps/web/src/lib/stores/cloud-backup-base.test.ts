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

  it("keeps map and canvas bases beside entities without listing them as entities", async () => {
    const map = { id: "m1", name: "Atlas" };
    await store.recordSent("v1", [ent("a")], []);
    await store.recordSentWhole("v1", "map", [map], []);
    await store.recordSentWhole(
      "v1",
      "canvas",
      [{ id: "m1", name: "Plot" }],
      [],
    );
    expect(await store.getWhole("v1", "map", "m1")).toEqual(map);
    expect(await store.getWhole("v1", "canvas", "m1")).toEqual({
      id: "m1",
      name: "Plot",
    });
    expect(await ids(store, "v1")).toEqual(["a"]);
    expect(await store.listWhole("v1", "map")).toEqual({ m1: map });
    await store.recordSentWhole("v1", "map", [], ["m1"]);
    expect(await store.getWhole("v1", "map", "m1")).toBeUndefined();
  });

  it("keeps map and canvas bases through an entity-only replace, and replaces them when given", async () => {
    await store.recordSentWhole("v1", "map", [{ id: "m1", name: "A" }], []);
    await store.recordSentWhole("v1", "canvas", [{ id: "c1", name: "C" }], []);
    await store.replaceVault("v1", [ent("a")]);
    expect(Object.keys(await store.listWhole("v1", "map"))).toEqual(["m1"]);
    expect(Object.keys(await store.listWhole("v1", "canvas"))).toEqual(["c1"]);

    await store.replaceVault("v1", [ent("a")], {
      maps: [{ id: "m2", name: "B" }],
      canvases: [],
    });
    expect(Object.keys(await store.listWhole("v1", "map"))).toEqual(["m2"]);
    expect(await store.listWhole("v1", "canvas")).toEqual({});
    expect(await ids(store, "v1")).toEqual(["a"]);
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
