import { describe, expect, it, vi } from "vitest";
import { handleCloudBackupDelta } from "../cloud-backup-delta";
import { handleCommitCloudBackup } from "../cloud-backup-snapshot";
import {
  getAssetKey,
  getManifestKey,
  readManifest,
} from "../cloud-backup-storage";
import { readAllEntities } from "../cloud-backup-shards";
import {
  createBackupFixture,
  jsonRequest,
  readCurrent,
} from "./cloud-backup-fixtures";

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
    expect(
      await readAllEntities(
        env,
        backupId,
        (await readManifest(env, backupId))!.objects!,
      ),
    ).toEqual([{ id: "a", title: "A" }]);
    expect(await readCurrent(env, backupId, "bundle")).toEqual({ maps: [] });
    expect(await env.BUCKET.head(getAssetKey(backupId, "old"))).toBeNull();
    expect(await env.BUCKET.head(getAssetKey(backupId, "keep"))).not.toBeNull();
    const stagedBundle = put.mock.calls.findIndex(([key]) =>
      String(key).endsWith("/bundle.json"),
    );
    expect(String(put.mock.calls[stagedBundle][0])).toContain("/commits/1-");
    const manifestWrite = put.mock.calls.findIndex(
      ([key]) => key === getManifestKey(backupId),
    );
    const prune = remove.mock.calls.findIndex(
      ([key]) => key === getAssetKey(backupId, "old"),
    );
    expect(put.mock.invocationCallOrder[stagedBundle]).toBeLessThan(
      put.mock.invocationCallOrder[manifestWrite],
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
    expect(await readCurrent(env, backupId, "bundle")).toEqual({
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

  it("counts every full commit as a revision and stamps every entity", async () => {
    const { env, backupId, ownerCode } = await createBackupFixture();
    const commit = async (bundle: unknown) =>
      (
        await (
          await handleCommitCloudBackup(
            jsonRequest({ vaultTitle: "V", bundle }, ownerCode),
            env,
            backupId,
          )
        ).json()
      ).manifest;
    expect((await commit({ entities: [{ id: "a" }] })).revision).toBe(1);
    const second = await commit({ entities: [{ id: "a" }, { id: "b" }] });
    expect(second.revision).toBe(2);
    expect((await readManifest(env, backupId))!.manifest.revision).toBe(2);
    const index = await readCurrent(env, backupId, "index");
    for (const id of ["a", "b"]) {
      expect(index.entityMeta[id]).toEqual({
        rev: 2,
        editedBy: "owner",
        editedAt: second.lastPushedAt,
      });
    }
    expect(
      (
        await readAllEntities(
          env,
          backupId,
          (await readManifest(env, backupId))!.objects!,
        )
      )
        .map((entity) => entity.id)
        .sort(),
    ).toEqual(["a", "b"]);
  });

  it("raises the revision for a v1 bundle too", async () => {
    const { env, backupId, ownerCode } = await createBackupFixture();
    const response = await handleCommitCloudBackup(
      jsonRequest({ vaultTitle: "V", bundle: { notes: [] } }, ownerCode),
      env,
      backupId,
    );
    expect((await response.json()).manifest.revision).toBe(1);
  });

  it("moves feedHorizon to its own revision and carries tombstones forward", async () => {
    const { env, backupId, ownerCode } = await createBackupFixture();
    const commit = async (entities: unknown[]) =>
      (
        await (
          await handleCommitCloudBackup(
            jsonRequest({ vaultTitle: "V", bundle: { entities } }, ownerCode),
            env,
            backupId,
          )
        ).json()
      ).manifest;
    const first = await commit([
      { id: "a", title: "A" },
      { id: "b", title: "B" },
      { id: "c", title: "C" },
    ]);
    expect(first.feedHorizon).toBe(1);
    await handleCloudBackupDelta(
      jsonRequest(
        {
          vaultTitle: "V",
          baseLastPushedAt: first.lastPushedAt,
          baseRevision: 1,
          upserts: [],
          deletes: ["b", "c"],
        },
        ownerCode,
      ),
      env,
      backupId,
    );
    const before = (await readManifest(env, backupId))!;
    expect(Object.keys(before.objects!.trash!).length).toBeGreaterThan(0);

    // The snapshot brings "c" back live and leaves "b" out.
    const full = await commit([
      { id: "a", title: "A" },
      { id: "c", title: "C again" },
    ]);
    expect(full.revision).toBe(3);
    expect(full.feedHorizon).toBe(3);
    const stored = (await readManifest(env, backupId))!;
    const index = await readCurrent(env, backupId, "index");
    expect(Object.keys(index.tombstones)).toEqual(["b"]);
    expect(index.tombstones.b.rev).toBe(2);
    const trashed = Object.assign(
      {},
      ...(await Promise.all(
        Object.values(stored.objects!.trash!).map(async (key) =>
          JSON.parse(
            await (
              await env.BUCKET.get(`cloud-backup/${backupId}/${key}`)
            ).text(),
          ),
        ),
      )),
    );
    expect(trashed).toEqual({ b: { id: "b", title: "B" } });
  });

  it("writes no tombstones or trash for a v1 bundle", async () => {
    const { env, backupId, ownerCode } = await createBackupFixture();
    await handleCommitCloudBackup(
      jsonRequest({ vaultTitle: "V", bundle: { notes: [] } }, ownerCode),
      env,
      backupId,
    );
    const stored = (await readManifest(env, backupId))!;
    expect(stored.objects!.trash).toBeUndefined();
    expect(stored.manifest.feedHorizon).toBe(1);
  });
});
