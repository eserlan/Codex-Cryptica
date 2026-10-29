import { describe, expect, it } from "vitest";
import {
  handleGetCloudBackupBundle,
  handleGetCloudBackupIndex,
  handleGetCloudBackupStatus,
} from "../cloud-backup-reads";
import {
  getBundleKey,
  getIndexKey,
  getShardKey,
  readManifest,
  writeJson,
  writeManifest,
} from "../cloud-backup-storage";
import { createBackupFixture, ownerRequest } from "./cloud-backup-fixtures";

describe("cloud backup restore reads", () => {
  it("reads status and an empty legacy index, hiding missing bundles", async () => {
    const { env, backupId, ownerCode, manifest } = await createBackupFixture();
    expect(
      await (
        await handleGetCloudBackupStatus(ownerRequest(ownerCode), env, backupId)
      ).json(),
    ).toEqual({
      status: "idle",
      lastPushedAt: manifest.lastPushedAt,
      sizeBytes: 0,
    });
    expect(
      await (
        await handleGetCloudBackupIndex(ownerRequest(ownerCode), env, backupId)
      ).json(),
    ).toEqual({ lastPushedAt: manifest.lastPushedAt, entityHashes: {} });
    expect(
      (await handleGetCloudBackupBundle(ownerRequest(ownerCode), env, backupId))
        .status,
    ).toBe(404);
  });

  it("restores shards without mutating the manifest and exposes only hashes in the index", async () => {
    const { env, backupId, ownerCode } = await createBackupFixture();
    const stored = (await readManifest(env, backupId))!;
    const manifest = {
      ...stored.manifest,
      schemaVersion: 2 as const,
      shardCount: 256,
      entityCount: 1,
    };
    await writeManifest(env, backupId, manifest, stored.ownerCodeHash!);
    await writeJson(env, getBundleKey(backupId), { maps: [] });
    await writeJson(env, getShardKey(backupId, "01"), {
      a: { id: "a", content: "private" },
    });
    await writeJson(env, getIndexKey(backupId), {
      entityHashes: { a: "hash" },
    });
    env.BUCKET.resetOps();
    const bundle = await handleGetCloudBackupBundle(
      ownerRequest(ownerCode),
      env,
      backupId,
    );
    expect(await bundle.json()).toEqual({
      manifest,
      bundle: { maps: [], entities: [{ id: "a", content: "private" }] },
    });
    expect(
      await (
        await handleGetCloudBackupIndex(ownerRequest(ownerCode), env, backupId)
      ).json(),
    ).toEqual({
      lastPushedAt: manifest.lastPushedAt,
      entityHashes: { a: "hash" },
    });
    expect((await readManifest(env, backupId))?.manifest).toEqual(manifest);
    expect(env.BUCKET.ops.put).toBe(0);
  });

  it("rejects unauthorized reads before exposing content or metadata", async () => {
    const { env, backupId } = await createBackupFixture();
    for (const handler of [
      handleGetCloudBackupBundle,
      handleGetCloudBackupIndex,
      handleGetCloudBackupStatus,
    ]) {
      expect((await handler(ownerRequest("wrong"), env, backupId)).status).toBe(
        404,
      );
      expect((await handler(ownerRequest(), {}, backupId)).status).toBe(500);
    }
  });
});
