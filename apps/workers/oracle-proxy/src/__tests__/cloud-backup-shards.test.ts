import { describe, expect, it } from "vitest";
import type { Shard } from "../cloud-backup-entities";
import {
  readAllEntities,
  writeIndex,
  writeShards,
} from "../cloud-backup-shards";
import {
  getBundleKey,
  getIndexKey,
  getShardKey,
  readJson,
  writeJson,
} from "../cloud-backup-storage";
import { Bucket } from "./r2-memory-bucket";

describe("cloud backup shard persistence", () => {
  it("replaces stale shards, deletes empty shards and reads in shard order", async () => {
    const env = { BUCKET: new Bucket() };
    await writeJson(env, getShardKey("b", "stale"), { old: { id: "old" } });
    await writeJson(env, getBundleKey("b"), { maps: [] });
    await writeShards(
      env,
      "b",
      new Map<string, Shard>([
        ["02", { z: { id: "z" } }],
        ["01", { a: { id: "a" } }],
        ["empty", {}],
      ]),
      true,
    );
    expect(await readAllEntities(env, "b")).toEqual([{ id: "a" }, { id: "z" }]);
    expect(await env.BUCKET.head(getShardKey("b", "stale"))).toBeNull();
    expect(await env.BUCKET.head(getShardKey("b", "empty"))).toBeNull();
    expect(await readJson(env, getBundleKey("b"))).toEqual({ maps: [] });
  });

  it("updates only touched shards for a delta and stores the index envelope", async () => {
    const env = { BUCKET: new Bucket() };
    await writeShards(
      env,
      "b",
      new Map<string, Shard>([
        ["01", { a: { id: "a" } }],
        ["02", { b: { id: "b" } }],
      ]),
      false,
    );
    await writeShards(env, "b", new Map<string, Shard>([["01", {}]]), false);
    expect(await readAllEntities(env, "b")).toEqual([{ id: "b" }]);
    await writeIndex(env, "b", { b: "hash" });
    expect(await readJson(env, getIndexKey("b"))).toEqual({
      entityHashes: { b: "hash" },
    });
    expect(await readAllEntities(env, "missing")).toEqual([]);
  });

  it("propagates malformed shard JSON", async () => {
    const env = { BUCKET: new Bucket() };
    await env.BUCKET.put(getShardKey("b", "01"), "{");
    await expect(readAllEntities(env, "b")).rejects.toThrow();
  });
});
