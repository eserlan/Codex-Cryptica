import { describe, expect, it, vi } from "vitest";
import {
  cloudBackupRevisionOf,
  hashCloudBackupEntity,
} from "../../../../../packages/schema/src/publishing";
import { handleCloudBackupDelta } from "../cloud-backup-delta";
import { handleCommitCloudBackup } from "../cloud-backup-snapshot";
import {
  getAssetKey,
  getManifestKey,
  readManifest,
  writeManifest,
} from "../cloud-backup-storage";
import {
  handleGetCloudBackupBundle,
  handleGetCloudBackupIndex,
} from "../cloud-backup-reads";
import { readAllEntities } from "../cloud-backup-shards";
import {
  createBackupFixture,
  jsonRequest,
  ownerRequest,
  readCurrent,
} from "./cloud-backup-fixtures";

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
    expect(
      await readAllEntities(
        env,
        backupId,
        (await readManifest(env, backupId))!.objects!,
      ),
    ).toEqual([entity]);
    expect(await readCurrent(env, backupId, "index")).toEqual({
      entityHashes: { a: await hashCloudBackupEntity(entity) },
      entityMeta: {
        a: {
          rev: 2,
          editedBy: "owner",
          editedAt: (await readManifest(env, backupId))!.manifest.lastPushedAt,
        },
      },
    });
    expect(await readCurrent(env, backupId, "bundle")).toEqual({
      maps: [{ id: "map" }],
      untouched: true,
    });
    const bundleWrite = put.mock.calls.findIndex(
      ([key]) =>
        typeof key === "string" &&
        key.startsWith(`cloud-backup/${backupId}/commits/`) &&
        key.endsWith("/bundle.json"),
    );
    expect(bundleWrite).toBeGreaterThanOrEqual(0);
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
    const bundleBefore = (await readManifest(env, backupId))!.objects!.bundle;
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
    expect(
      put.mock.calls.filter(([key]) => String(key).endsWith("/bundle.json")),
    ).toEqual([]);
    expect((await readManifest(env, backupId))!.objects!.bundle).toBe(
      bundleBefore,
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

  const send = (
    fixture: Awaited<ReturnType<typeof committedFixture>>,
    extra: Record<string, unknown>,
    upserts: unknown[] = [],
    deletes: string[] = [],
  ) =>
    handleCloudBackupDelta(
      jsonRequest(
        { vaultTitle: "Vault", upserts, deletes, ...extra },
        fixture.ownerCode,
      ),
      fixture.env,
      fixture.backupId,
    );

  it("raises the revision by one per commit", async () => {
    const fixture = await committedFixture();
    const { env, backupId } = fixture;
    expect(cloudBackupRevisionOf(fixture.manifest)).toBe(1);
    let manifest = fixture.manifest;
    for (const expected of [2, 3]) {
      const response = await send(fixture, {
        baseLastPushedAt: manifest.lastPushedAt,
        baseRevision: cloudBackupRevisionOf(manifest),
      });
      expect(response.status).toBe(200);
      manifest = (await response.json()).manifest;
      expect(manifest.revision).toBe(expected);
      expect((await readManifest(env, backupId))!.manifest.revision).toBe(
        expected,
      );
    }
  });

  it("refuses a stale base revision without writing", async () => {
    const fixture = await committedFixture();
    fixture.env.BUCKET.resetOps();
    const response = await send(fixture, {
      baseLastPushedAt: fixture.manifest.lastPushedAt,
      baseRevision: 0,
    });
    expect(response.status).toBe(409);
    const { error } = await response.json();
    expect(error.code).toBe("diverged");
    expect(error.revision).toBe(1);
    expect(fixture.env.BUCKET.ops.put).toBe(0);
    expect(fixture.env.BUCKET.ops.delete).toBe(0);
  });

  it("stamps upserts, keeps other stamps and leaves content untouched", async () => {
    const fixture = await committedFixture();
    const { env, backupId, ownerCode, manifest } = fixture;
    const before = (await readCurrent(env, backupId, "index")).entityMeta;
    const entity = { id: "a", title: "New" };
    const response = await send(
      fixture,
      { baseLastPushedAt: manifest.lastPushedAt, baseRevision: 1 },
      [entity],
      ["remove"],
    );
    const committed = (await response.json()).manifest;
    const index = await readCurrent(env, backupId, "index");
    expect(index.entityMeta.a).toEqual({
      rev: 2,
      editedBy: "owner",
      editedAt: committed.lastPushedAt,
    });
    expect(index.entityMeta.remove).toBeUndefined();
    expect(before.remove).toEqual({
      rev: 1,
      editedBy: "owner",
      editedAt: expect.any(String),
    });
    expect(
      await readAllEntities(
        env,
        backupId,
        (await readManifest(env, backupId))!.objects!,
      ),
    ).toEqual([entity]);
    expect(index.entityHashes.a).toBe(await hashCloudBackupEntity(entity));

    const bundle = await (
      await handleGetCloudBackupBundle(ownerRequest(ownerCode), env, backupId)
    ).json();
    expect(bundle.bundle.entities).toEqual([entity]);
    expect(
      await (
        await handleGetCloudBackupIndex(ownerRequest(ownerCode), env, backupId)
      ).json(),
    ).toEqual({
      lastPushedAt: committed.lastPushedAt,
      entityHashes: index.entityHashes,
    });
  });

  it("keeps existing stamps for entities a delta does not touch", async () => {
    const fixture = await committedFixture();
    const { env, backupId, manifest } = fixture;
    const before = (await readCurrent(env, backupId, "index")).entityMeta;
    await send(fixture, { baseLastPushedAt: manifest.lastPushedAt }, [
      { id: "b" },
    ]);
    const after = (await readCurrent(env, backupId, "index")).entityMeta;
    expect(after.a).toEqual(before.a);
    expect(after.b.rev).toBe(2);
  });

  it("treats a backup without a revision as revision 0", async () => {
    const fixture = await committedFixture();
    const { env, backupId } = fixture;
    const { manifest, ownerCodeHash, objects, etag } = (await readManifest(
      env,
      backupId,
    ))!;
    const { revision: _revision, ...legacy } = manifest;
    await writeManifest(env, backupId, legacy, ownerCodeHash!, objects, etag);
    const stale = await send(fixture, {
      baseLastPushedAt: manifest.lastPushedAt,
      baseRevision: 1,
    });
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.revision).toBe(0);
    const ok = await send(fixture, {
      baseLastPushedAt: manifest.lastPushedAt,
      baseRevision: 0,
    });
    expect(ok.status).toBe(200);
    expect((await ok.json()).manifest.revision).toBe(1);
  });

  it("accepts a timestamp-only delta from an older web app", async () => {
    const fixture = await committedFixture();
    const ok = await send(fixture, {
      baseLastPushedAt: fixture.manifest.lastPushedAt,
    });
    expect(ok.status).toBe(200);
    expect((await ok.json()).manifest.revision).toBe(2);
    const stale = await send(fixture, {
      baseLastPushedAt: "2020-01-01T00:00:00.000Z",
    });
    expect(stale.status).toBe(409);
  });
});
