import { describe, expect, it } from "vitest";
import { CLOUD_BACKUP_LIMITS } from "../../../../../packages/schema/src/publishing";
import {
  handleCloudBackupAssetUpload,
  handleGetCloudBackupAsset,
} from "../cloud-backup-assets";
import { getAssetKey } from "../cloud-backup-storage";
import { createBackupFixture, ownerRequest } from "./cloud-backup-fixtures";

describe("cloud backup asset transfer", () => {
  it("uploads and replaces an asset, preserving bytes and content type on restore", async () => {
    const { env, backupId, ownerCode } = await createBackupFixture();
    for (const body of ["first", "replacement"]) {
      const response = await handleCloudBackupAssetUpload(
        ownerRequest(ownerCode, {
          method: "PUT",
          body,
          headers: { "Content-Type": "image/png" },
        }),
        env,
        backupId,
        "map.png",
      );
      expect(await response.json()).toEqual({
        assetId: "map.png",
        sizeBytes: body.length,
      });
    }
    const restored = await handleGetCloudBackupAsset(
      ownerRequest(ownerCode),
      env,
      backupId,
      "map.png",
    );
    expect(restored.headers.get("Content-Type")).toBe("image/png");
    expect(await restored.text()).toBe("replacement");
    await env.BUCKET.put(getAssetKey(backupId, "raw"), "raw");
    expect(
      (
        await handleGetCloudBackupAsset(
          ownerRequest(ownerCode),
          env,
          backupId,
          "raw",
        )
      ).headers.get("Content-Type"),
    ).toBe("application/octet-stream");
  });

  it("authorizes before validation and rejects unsafe or oversized uploads without writes", async () => {
    const { env, backupId, ownerCode } = await createBackupFixture();
    env.BUCKET.resetOps();
    expect(
      (
        await handleCloudBackupAssetUpload(
          ownerRequest("wrong", { method: "PUT", body: "data" }),
          env,
          backupId,
          "../bad",
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await handleCloudBackupAssetUpload(
          ownerRequest(ownerCode, { method: "PUT", body: "data" }),
          env,
          backupId,
          "../bad",
        )
      ).status,
    ).toBe(400);
    const oversized = await handleCloudBackupAssetUpload(
      ownerRequest(ownerCode, {
        method: "PUT",
        body: "data",
        headers: {
          "Content-Length": String(CLOUD_BACKUP_LIMITS.maxAssetBytes + 1),
        },
      }),
      env,
      backupId,
      "large",
    );
    expect(oversized.status).toBe(413);
    expect(env.BUCKET.ops.put).toBe(0);
    expect(
      (
        await handleGetCloudBackupAsset(
          ownerRequest(ownerCode),
          env,
          backupId,
          "missing",
        )
      ).status,
    ).toBe(404);
  });
});
