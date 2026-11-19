import { describe, expect, it } from "vitest";
import type { Shard } from "../cloud-backup-entities";
import {
  readAllEntities,
  stageIndex,
  stageShards,
} from "../cloud-backup-shards";
import {
  MissingBackupObjectError,
  getBundleKey,
  getShardKey,
  getStagedKey,
  legacyObjects,
  readJson,
  writeJson,
} from "../cloud-backup-storage";
import { Bucket } from "./r2-memory-bucket";

describe("cloud backup shard persistence", () => {
  it("stages non-empty shards under the commit tag and reads them in shard order", async () => {
    const env = { BUCKET: new Bucket() };
    await writeJson(env, getShardKey("b", "stale"), { old: { id: "old" } });
    await writeJson(env, getBundleKey("b"), { maps: [] });
    const shards = await stageShards(
      env,
      "b",
      "2-x",
      new Map<string, Shard>([
        ["02", { z: { id: "z" } }],
        ["01", { a: { id: "a" } }],
        ["empty", {}],
      ]),
    );
    expect(shards).toEqual({
      "02": "commits/2-x/entities/02.json",
      "01": "commits/2-x/entities/01.json",
    });
    expect(await readAllEntities(env, "b", { shards })).toEqual([
      { id: "a" },
      { id: "z" },
    ]);
    expect(
      await env.BUCKET.head(getStagedKey("b", "2-x", "entities/empty.json")),
    ).toBeNull();
    // Staging never touches an object a manifest may reference.
    expect(await readJson(env, getShardKey("b", "stale"))).toEqual({
      old: { id: "old" },
    });
    expect(await readJson(env, getBundleKey("b"))).toEqual({ maps: [] });
  });

  it("stages the index envelope under the commit tag", async () => {
    const env = { BUCKET: new Bucket() };
    const index = await stageIndex(env, "b", "2-x", { b: "hash" }, {});
    expect(index).toBe("commits/2-x/index.json");
    expect(await readJson(env, getStagedKey("b", "2-x", "index.json"))).toEqual(
      { entityHashes: { b: "hash" }, entityMeta: {} },
    );
  });

  it("reads legacy shards found by listing entities/", async () => {
    const env = { BUCKET: new Bucket() };
    await writeJson(env, getShardKey("b", "02"), { z: { id: "z" } });
    await writeJson(env, getShardKey("b", "01"), { a: { id: "a" } });
    const objects = await legacyObjects(env, "b");
    expect(await readAllEntities(env, "b", objects)).toEqual([
      { id: "a" },
      { id: "z" },
    ]);
    expect(
      await readAllEntities(env, "b", await legacyObjects(env, "none")),
    ).toEqual([]);
  });

  it("fails on a missing referenced shard and propagates malformed shard JSON", async () => {
    const env = { BUCKET: new Bucket() };
    await expect(
      readAllEntities(env, "b", { shards: { "01": "entities/01.json" } }),
    ).rejects.toBeInstanceOf(MissingBackupObjectError);
    await env.BUCKET.put(getShardKey("b", "01"), "{");
    await expect(
      readAllEntities(env, "b", { shards: { "01": "entities/01.json" } }),
    ).rejects.toThrow();
  });
});
