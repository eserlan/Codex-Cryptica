import { describe, expect, it } from "vitest";
import {
  handleDeleteCloudBackup,
  handleEnableCloudBackup,
} from "../cloud-backup-lifecycle";
import {
  getAssetKey,
  getManifestKey,
  readManifest,
} from "../cloud-backup-storage";
import { hashOwnerCode } from "../cloud-backup-auth";
import {
  createBackupFixture,
  jsonRequest,
  ownerRequest,
} from "./cloud-backup-fixtures";
import { Bucket } from "./r2-memory-bucket";

describe("cloud backup lifecycle", () => {
  it("creates only a manifest with a hashed owner code", async () => {
    const { env, backupId, ownerCode, manifest } = await createBackupFixture();
    expect([...env.BUCKET.store.keys()]).toEqual([getManifestKey(backupId)]);
    expect(manifest.sizeBytes).toBe(0);
    expect(await readManifest(env, backupId)).toEqual({
      manifest,
      ownerCodeHash: await hashOwnerCode(ownerCode),
    });
    expect(JSON.stringify([...env.BUCKET.store])).not.toContain(ownerCode);
  });

  it("rejects bad JSON and missing titles without writing", async () => {
    const env = { BUCKET: new Bucket() };
    for (const body of [null, {}, { vaultTitle: " " }])
      expect(
        (await handleEnableCloudBackup(jsonRequest(body), env)).status,
      ).toBe(400);
    expect(
      (
        await handleEnableCloudBackup(
          ownerRequest(undefined, { method: "POST", body: "{" }),
          env,
        )
      ).status,
    ).toBe(400);
    expect(env.BUCKET.ops.put).toBe(0);
    expect(
      (await handleEnableCloudBackup(jsonRequest({ vaultTitle: "Vault" }), {}))
        .status,
    ).toBe(500);
  });

  it("requires the owner before erasing all backup objects", async () => {
    const { env, backupId, ownerCode } = await createBackupFixture();
    await env.BUCKET.put(getAssetKey(backupId, "map"), "bytes");
    expect(
      (await handleDeleteCloudBackup(ownerRequest("wrong"), env, backupId))
        .status,
    ).toBe(404);
    expect(env.BUCKET.ops.delete).toBe(0);
    const response = await handleDeleteCloudBackup(
      ownerRequest(ownerCode),
      env,
      backupId,
    );
    expect(await response.json()).toEqual({ deleted: true });
    expect(env.BUCKET.store.size).toBe(0);
  });
});
