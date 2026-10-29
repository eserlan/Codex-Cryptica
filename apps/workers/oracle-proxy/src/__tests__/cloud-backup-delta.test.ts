import { describe, expect, it, vi } from "vitest";
import { hashCloudBackupEntity } from "../../../../../packages/schema/src/publishing";
import { handleCloudBackupDelta } from "../cloud-backup-delta";
import { handleCommitCloudBackup } from "../cloud-backup-snapshot";
import {
  getAssetKey,
  getBundleKey,
  getIndexKey,
  getManifestKey,
  readJson,
  readManifest,
} from "../cloud-backup-storage";
import { readAllEntities } from "../cloud-backup-shards";
import { createBackupFixture, jsonRequest } from "./cloud-backup-fixtures";

async function committedFixture() {
  const fixture = await createBackupFixture();
  const { env, backupId, ownerCode } = fixture;
  await handleCommitCloudBackup(
    jsonRequest(
      {
        vaultTitle: "Vault",
        bundle: {
          entities: [{ id: "a", title: "Old" }, { id: "remove" }],
          maps: [],
          untouched: true,
        },
      },
      ownerCode,
    ),
    env,
    backupId,
  );
  return {
    ...fixture,
    manifest: (await readManifest(env, backupId))!.manifest,
  };
}

describe("cloud backup incremental commits", () => {
  it("updates touched entities and bundle sections before publishing and pruning", async () => {
    const { env, backupId, ownerCode, manifest } = await committedFixture();
    await env.BUCKET.put(getAssetKey(backupId, "old"), "old");
    const put = vi.spyOn(env.BUCKET, "put");
    const remove = vi.spyOn(env.BUCKET, "delete");
    const entity = { id: "a", title: "New" };
    const response = await handleCloudBackupDelta(
      jsonRequest(
        {
          vaultTitle: "Updated",
          baseLastPushedAt: manifest.lastPushedAt,
          upserts: [entity],
          deletes: ["remove"],
          maps: [{ id: "map" }],
          assetIds: [],
        },
        ownerCode,
      ),
      env,
      backupId,
    );
    expect(response.status).toBe(200);
    expect((await response.json()).manifest).toMatchObject({
      vaultTitle: "Updated",
      entityCount: 1,
    });
    expect(await readAllEntities(env, backupId)).toEqual([entity]);
    expect(await readJson(env, getIndexKey(backupId))).toEqual({
      entityHashes: { a: await hashCloudBackupEntity(entity) },
    });
    expect(await readJson(env, getBundleKey(backupId))).toEqual({
      maps: [{ id: "map" }],
      untouched: true,
    });
    const bundleWrite = put.mock.calls.findIndex(
      ([key]) => key === getBundleKey(backupId),
    );
    const manifestWrite = put.mock.calls.findIndex(
      ([key]) => key === getManifestKey(backupId),
    );
    const prune = remove.mock.calls.findIndex(
      ([key]) => key === getAssetKey(backupId, "old"),
    );
    expect(put.mock.invocationCallOrder[bundleWrite]).toBeLessThan(
      put.mock.invocationCallOrder[manifestWrite],
    );
    expect(put.mock.invocationCallOrder[manifestWrite]).toBeLessThan(
      remove.mock.invocationCallOrder[prune],
    );
    expect(await env.BUCKET.head(getAssetKey(backupId, "old"))).toBeNull();
  });

  it("leaves the bundle and assets alone when those sections are omitted", async () => {
    const { env, backupId, ownerCode, manifest } = await committedFixture();
    await env.BUCKET.put(getAssetKey(backupId, "keep"), "bytes");
    const put = vi.spyOn(env.BUCKET, "put");
    expect(
      (
        await handleCloudBackupDelta(
          jsonRequest(
            {
              vaultTitle: "Vault",
              baseLastPushedAt: manifest.lastPushedAt,
              upserts: [],
              deletes: [],
            },
            ownerCode,
          ),
          env,
          backupId,
        )
      ).status,
    ).toBe(200);
    expect(put.mock.calls.map(([key]) => key)).not.toContain(
      getBundleKey(backupId),
    );
    expect(await env.BUCKET.head(getAssetKey(backupId, "keep"))).not.toBeNull();
  });

  it("refuses invalid, stale and legacy deltas without mutating storage", async () => {
    const { env, backupId, ownerCode, manifest } = await createBackupFixture();
    const delta = {
      vaultTitle: "Vault",
      baseLastPushedAt: manifest.lastPushedAt,
      upserts: [],
      deletes: [],
    };
    const legacy = await handleCloudBackupDelta(
      jsonRequest(delta, ownerCode),
      env,
      backupId,
    );
    expect(legacy.status).toBe(409);
    expect((await legacy.json()).error.code).toBe("full_push_required");
    expect(
      (
        await handleCloudBackupDelta(
          jsonRequest({ ...delta, assetIds: ["../bad"] }, ownerCode),
          env,
          backupId,
        )
      ).status,
    ).toBe(400);
    await handleCommitCloudBackup(
      jsonRequest({ vaultTitle: "Vault", bundle: { entities: [] } }, ownerCode),
      env,
      backupId,
    );
    env.BUCKET.resetOps();
    const stale = await handleCloudBackupDelta(
      jsonRequest(
        { ...delta, baseLastPushedAt: "2020-01-01T00:00:00.000Z" },
        ownerCode,
      ),
      env,
      backupId,
    );
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe("diverged");
    expect(env.BUCKET.ops.put).toBe(0);
    expect(env.BUCKET.ops.delete).toBe(0);
  });

  it("does not publish or prune when writing the updated index fails", async () => {
    const { env, backupId, ownerCode, manifest } = await committedFixture();
    await env.BUCKET.put(getAssetKey(backupId, "keep"), "bytes");
    vi.spyOn(env.BUCKET, "put").mockRejectedValueOnce(
      new Error("index failed"),
    );
    await expect(
      handleCloudBackupDelta(
        jsonRequest(
          {
            vaultTitle: "Changed",
            baseLastPushedAt: manifest.lastPushedAt,
            upserts: [],
            deletes: [],
            assetIds: [],
          },
          ownerCode,
        ),
        env,
        backupId,
      ),
    ).rejects.toThrow("index failed");
    expect((await readManifest(env, backupId))?.manifest).toEqual(manifest);
    expect(await env.BUCKET.head(getAssetKey(backupId, "keep"))).not.toBeNull();
  });
});
