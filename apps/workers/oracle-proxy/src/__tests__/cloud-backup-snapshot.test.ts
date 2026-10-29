import { describe, expect, it, vi } from "vitest";
import { handleCommitCloudBackup } from "../cloud-backup-snapshot";
import {
  getAssetKey,
  getBundleKey,
  getManifestKey,
  readJson,
  readManifest,
} from "../cloud-backup-storage";
import { readAllEntities } from "../cloud-backup-shards";
import { createBackupFixture, jsonRequest } from "./cloud-backup-fixtures";

describe("cloud backup full snapshots", () => {
  it("shards entity bundles and writes the manifest before pruning assets", async () => {
    const { env, backupId, ownerCode } = await createBackupFixture();
    await env.BUCKET.put(getAssetKey(backupId, "old"), "old");
    await env.BUCKET.put(getAssetKey(backupId, "keep"), "keep");
    const put = vi.spyOn(env.BUCKET, "put");
    const remove = vi.spyOn(env.BUCKET, "delete");
    const response = await handleCommitCloudBackup(
      jsonRequest(
        {
          vaultTitle: "New title",
          bundle: { entities: [{ id: "a", title: "A" }], maps: [] },
          assetIds: ["keep"],
        },
        ownerCode,
      ),
      env,
      backupId,
    );
    expect(response.status).toBe(200);
    expect((await response.json()).manifest).toMatchObject({
      schemaVersion: 2,
      entityCount: 1,
      vaultTitle: "New title",
    });
    expect(await readAllEntities(env, backupId)).toEqual([
      { id: "a", title: "A" },
    ]);
    expect(await readJson(env, getBundleKey(backupId))).toEqual({ maps: [] });
    expect(await env.BUCKET.head(getAssetKey(backupId, "old"))).toBeNull();
    expect(await env.BUCKET.head(getAssetKey(backupId, "keep"))).not.toBeNull();
    const manifestWrite = put.mock.calls.findIndex(
      ([key]) => key === getManifestKey(backupId),
    );
    const prune = remove.mock.calls.findIndex(
      ([key]) => key === getAssetKey(backupId, "old"),
    );
    expect(put.mock.invocationCallOrder[manifestWrite]).toBeLessThan(
      remove.mock.invocationCallOrder[prune],
    );
  });

  it("keeps legacy bundles intact and rejects invalid payloads without writes", async () => {
    const { env, backupId, ownerCode } = await createBackupFixture();
    const response = await handleCommitCloudBackup(
      jsonRequest(
        { vaultTitle: "Legacy", bundle: { opaque: true } },
        ownerCode,
      ),
      env,
      backupId,
    );
    expect((await response.json()).manifest.schemaVersion).toBe(1);
    expect(await readJson(env, getBundleKey(backupId))).toEqual({
      opaque: true,
    });
    env.BUCKET.resetOps();
    expect(
      (await handleCommitCloudBackup(jsonRequest({}, ownerCode), env, backupId))
        .status,
    ).toBe(400);
    expect(env.BUCKET.ops.put).toBe(0);
  });

  it("keeps the previous manifest and assets when bundle writing fails", async () => {
    const { env, backupId, ownerCode, manifest } = await createBackupFixture();
    await env.BUCKET.put(getAssetKey(backupId, "old"), "old");
    vi.spyOn(env.BUCKET, "put").mockRejectedValueOnce(
      new Error("R2 unavailable"),
    );
    await expect(
      handleCommitCloudBackup(
        jsonRequest({ vaultTitle: "New", bundle: {} }, ownerCode),
        env,
        backupId,
      ),
    ).rejects.toThrow("R2 unavailable");
    expect((await readManifest(env, backupId))?.manifest).toEqual(manifest);
    expect(await env.BUCKET.head(getAssetKey(backupId, "old"))).not.toBeNull();
    expect(env.BUCKET.ops.delete).toBe(0);
  });
});
