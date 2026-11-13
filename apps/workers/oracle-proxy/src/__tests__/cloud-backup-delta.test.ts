import { describe, expect, it, vi } from "vitest";
import {
  CLOUD_BACKUP_LIMITS,
  cloudBackupRevisionOf,
  cloudBackupShardOf,
  hashCloudBackupEntity,
} from "../../../../../packages/schema/src/publishing";
import { handleCloudBackupDelta } from "../cloud-backup-delta";
import { handleCommitCloudBackup } from "../cloud-backup-snapshot";
import {
  absoluteKey,
  getAssetKey,
  readJson,
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
      tombstones: {
        remove: {
          id: "remove",
          rev: 2,
          deletedBy: "owner",
          deletedAt: (await readManifest(env, backupId))!.manifest.lastPushedAt,
          title: "",
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

  describe("tombstones", () => {
    async function seeded() {
      const fixture = await createBackupFixture();
      const { env, backupId, ownerCode } = fixture;
      const response = await handleCommitCloudBackup(
        jsonRequest(
          {
            vaultTitle: "Vault",
            bundle: {
              entities: [
                { id: "x", title: "Old Tower", body: "stone" },
                { id: "keep", title: "Keep" },
              ],
            },
          },
          ownerCode,
        ),
        env,
        backupId,
      );
      return { ...fixture, manifest: (await response.json()).manifest };
    }

    function send(
      f: Awaited<ReturnType<typeof seeded>>,
      base: { lastPushedAt: string; revision?: number },
      body: { upserts?: unknown[]; deletes?: string[] },
    ) {
      return handleCloudBackupDelta(
        jsonRequest(
          {
            vaultTitle: "Vault",
            baseLastPushedAt: base.lastPushedAt,
            baseRevision: base.revision,
            upserts: [],
            deletes: [],
            ...body,
          },
          f.ownerCode,
        ),
        f.env,
        f.backupId,
      );
    }

    it("writes a tombstone and keeps the content in trash", async () => {
      const f = await seeded();
      const response = await send(f, f.manifest, { deletes: ["x"] });
      const committed = (await response.json()).manifest;
      const stored = (await readManifest(f.env, f.backupId))!;
      const index = await readCurrent(f.env, f.backupId, "index");
      expect(index.tombstones).toEqual({
        x: {
          id: "x",
          rev: committed.revision,
          deletedBy: "owner",
          deletedAt: committed.lastPushedAt,
          title: "Old Tower",
        },
      });
      expect(index.entityHashes).not.toHaveProperty("x");
      expect(committed.entityCount).toBe(1);
      const trash = await readJson<any>(
        f.env,
        absoluteKey(
          f.backupId,
          stored.objects!.trash![cloudBackupShardOf("x")],
        ),
      );
      expect(trash).toEqual({
        x: { id: "x", title: "Old Tower", body: "stone" },
      });
      const live = await readAllEntities(f.env, f.backupId, stored.objects!);
      expect(live.map((entity) => entity.id)).toEqual(["keep"]);
      const body = await (
        await handleGetCloudBackupIndex(
          ownerRequest(f.ownerCode),
          f.env,
          f.backupId,
        )
      ).json();
      expect(body).not.toHaveProperty("tombstones");
      expect(Object.keys(body.entityHashes)).toEqual(["keep"]);
    });

    it("writes no tombstone for an unknown or already deleted id", async () => {
      const f = await seeded();
      await send(f, f.manifest, { deletes: ["ghost"] });
      let stored = (await readManifest(f.env, f.backupId))!;
      expect(stored.objects!.trash).toBeUndefined();
      expect(
        (await readCurrent(f.env, f.backupId, "index")).tombstones,
      ).toBeUndefined();

      await send(f, stored.manifest, { deletes: ["x"] });
      stored = (await readManifest(f.env, f.backupId))!;
      const first = (await readCurrent(f.env, f.backupId, "index")).tombstones;
      await send(f, stored.manifest, { deletes: ["x"] });
      expect(
        (await readCurrent(f.env, f.backupId, "index")).tombstones,
      ).toEqual(first);
    });

    it("brings an entity back when it is upserted again", async () => {
      const f = await seeded();
      await send(f, f.manifest, { deletes: ["x"] });
      const stored = (await readManifest(f.env, f.backupId))!;
      await send(f, stored.manifest, { upserts: [{ id: "x", title: "Back" }] });
      const after = (await readManifest(f.env, f.backupId))!;
      expect(
        (await readCurrent(f.env, f.backupId, "index")).tombstones,
      ).toBeUndefined();
      expect(after.objects!.trash).toBeUndefined();
      expect(after.manifest.entityCount).toBe(2);
    });

    it("writes no tombstone for an id both deleted and upserted", async () => {
      const f = await seeded();
      await send(f, f.manifest, {
        deletes: ["x"],
        upserts: [{ id: "x", title: "Same" }],
      });
      expect(
        (await readCurrent(f.env, f.backupId, "index")).tombstones,
      ).toBeUndefined();
      expect((await readManifest(f.env, f.backupId))!.objects!.trash).toBe(
        undefined,
      );
    });

    it("sets feedHorizon to the base revision on the first delta only", async () => {
      const f = await seeded();
      expect(f.manifest.feedHorizon).toBe(1);
      const legacy = { ...f.manifest };
      delete legacy.feedHorizon;
      const stored = (await readManifest(f.env, f.backupId))!;
      await writeManifest(
        f.env,
        f.backupId,
        legacy,
        stored.ownerCodeHash!,
        stored.objects,
        stored.etag,
      );
      await send(f, legacy, { upserts: [{ id: "n" }] });
      const first = (await readManifest(f.env, f.backupId))!.manifest;
      expect(first.revision).toBe(2);
      expect(first.feedHorizon).toBe(1);
      await send(f, first, { upserts: [{ id: "m" }] });
      expect(
        (await readManifest(f.env, f.backupId))!.manifest.feedHorizon,
      ).toBe(1);
    });

    it("keeps trash under its cap across delete cycles, tombstones included", async () => {
      const f = await seeded();
      const limits = CLOUD_BACKUP_LIMITS as { maxTrashBytes: number };
      const original = limits.maxTrashBytes;
      limits.maxTrashBytes = 3000;
      try {
        const trashBytes = async () => {
          const { objects } = (await readManifest(f.env, f.backupId))!;
          let total = 0;
          for (const key of Object.values(objects!.trash ?? {})) {
            total +=
              (await f.env.BUCKET.head(absoluteKey(f.backupId, key)))?.size ??
              0;
          }
          return total;
        };
        const body = "x".repeat(1000);
        for (let cycle = 0; cycle < 8; cycle++) {
          const id = `cycle-${cycle}`;
          const base = (await readManifest(f.env, f.backupId))!.manifest;
          await send(f, base, { upserts: [{ id, title: id, body }] });
          const next = (await readManifest(f.env, f.backupId))!.manifest;
          const response = await send(f, next, { deletes: [id] });
          expect(response.status).toBe(200);
          expect(await trashBytes()).toBeLessThanOrEqual(3000 + 200);
        }
        const index = await readCurrent(f.env, f.backupId, "index");
        expect(Object.keys(index.tombstones)).toHaveLength(8);
        const { objects } = (await readManifest(f.env, f.backupId))!;
        const kept = Object.assign(
          {},
          ...(await Promise.all(
            Object.values(objects!.trash!).map((key) =>
              readJson<any>(f.env, absoluteKey(f.backupId, key)),
            ),
          )),
        );
        expect(kept).toHaveProperty("cycle-7");
        expect(kept).not.toHaveProperty("cycle-0");
      } finally {
        limits.maxTrashBytes = original;
      }
    });

    it("does not count trash in sizeBytes", async () => {
      const f = await seeded();
      const before = f.manifest.sizeBytes;
      const response = await send(f, f.manifest, { deletes: ["x"] });
      const after = (await response.json()).manifest.sizeBytes;
      const index = await readCurrent(f.env, f.backupId, "index");
      const added = new TextEncoder().encode(
        JSON.stringify(index.tombstones),
      ).length;
      expect(after).toBeLessThanOrEqual(before + added + 16);
      const stored = (await readManifest(f.env, f.backupId))!;
      expect(
        await f.env.BUCKET.head(
          absoluteKey(
            f.backupId,
            stored.objects!.trash![cloudBackupShardOf("x")],
          ),
        ),
      ).not.toBeNull();
    });
  });
});
