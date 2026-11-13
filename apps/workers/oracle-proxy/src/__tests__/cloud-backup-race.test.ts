import { describe, expect, it, vi } from "vitest";
import {
  cloudBackupRevisionOf,
  hashCloudBackupEntity,
} from "../../../../../packages/schema/src/publishing";
import { handleCloudBackupReissueCode } from "../cloud-backup-admin";
import { handleCloudBackupDelta } from "../cloud-backup-delta";
import { handleEnableCloudBackup } from "../cloud-backup-lifecycle";
import {
  handleGetCloudBackupBundle,
  handleGetCloudBackupIndex,
  handleGetCloudBackupStatus,
} from "../cloud-backup-reads";
import { handleCommitCloudBackup } from "../cloud-backup-snapshot";
import {
  absoluteKey,
  getAssetKey,
  getIndexKey,
  getManifestKey,
  getShardKey,
  referencedKeys,
  readManifest,
  writeJson,
  writeManifest,
} from "../cloud-backup-storage";
import {
  createBackupFixture,
  jsonRequest,
  ownerRequest,
} from "./cloud-backup-fixtures";
import { Bucket } from "./r2-memory-bucket";

type Fixture = Awaited<ReturnType<typeof committedFixture>>;

async function committedFixture() {
  const fixture = await createBackupFixture();
  const { env, backupId, ownerCode } = fixture;
  const response = await handleCommitCloudBackup(
    jsonRequest(
      {
        vaultTitle: "Vault",
        bundle: {
          entities: [
            { id: "a", title: "A" },
            { id: "b", title: "B" },
          ],
          maps: [],
        },
      },
      ownerCode,
    ),
    env,
    backupId,
  );
  const manifest = (await response.json()).manifest;
  return { ...fixture, manifest };
}

function sendDelta(
  { env, backupId, ownerCode }: Fixture,
  base: { lastPushedAt: string; revision?: number },
  upserts: Array<Record<string, unknown>>,
  extra: Record<string, unknown> = {},
) {
  return handleCloudBackupDelta(
    jsonRequest(
      {
        vaultTitle: "Vault",
        baseLastPushedAt: base.lastPushedAt,
        baseRevision: base.revision,
        upserts,
        deletes: [],
        ...extra,
      },
      ownerCode,
    ),
    env,
    backupId,
  );
}

/** Runs `before` to completion just ahead of the next manifest write. */
function beforeManifestPut(bucket: Bucket, before: () => Promise<unknown>) {
  const put = bucket.put.bind(bucket);
  let fired = false;
  bucket.put = (async (key: string, ...rest: any[]) => {
    if (!fired && key.endsWith("/manifest.json")) {
      fired = true;
      await before();
    }
    return (put as any)(key, ...rest);
  }) as any;
}

async function bundleOf({ env, backupId, ownerCode }: Fixture) {
  const response = await handleGetCloudBackupBundle(
    ownerRequest(ownerCode),
    env,
    backupId,
  );
  return { status: response.status, body: (await response.json()) as any };
}

async function entitiesOf(fixture: Fixture) {
  const { body } = await bundleOf(fixture);
  return Object.fromEntries(
    (body.bundle.entities as any[]).map((entity) => [entity.id, entity.title]),
  );
}

/** Races delta A against delta B on one base; B finishes before A's switch. */
async function raceDeltas(fixture: Fixture) {
  const base = {
    lastPushedAt: fixture.manifest.lastPushedAt,
    revision: fixture.manifest.revision,
  };
  let winner!: Response;
  beforeManifestPut(fixture.env.BUCKET, async () => {
    winner = await sendDelta(fixture, base, [{ id: "w", title: "Winner" }]);
  });
  const loser = await sendDelta(fixture, base, [{ id: "l", title: "Loser" }]);
  return { winner, loser, base };
}

describe("race-safe cloud backup commit", () => {
  it("answers 409 diverged to exactly one of two deltas on one revision", async () => {
    const fixture = await committedFixture();
    const { winner, loser, base } = await raceDeltas(fixture);
    expect(winner.status).toBe(200);
    expect(loser.status).toBe(409);
    const { error } = await loser.json();
    expect(error.code).toBe("diverged");
    expect(error.revision).toBe(base.revision! + 1);
    expect((await winner.json()).manifest.revision).toBe(error.revision);
  });

  it("leaves nothing of the loser readable", async () => {
    const fixture = await committedFixture();
    const { env, backupId } = fixture;
    await raceDeltas(fixture);
    expect(await entitiesOf(fixture)).toEqual({
      a: "A",
      b: "B",
      w: "Winner",
    });
    const index = await (
      await handleGetCloudBackupIndex(
        ownerRequest(fixture.ownerCode),
        env,
        backupId,
      )
    ).json();
    expect(Object.keys(index.entityHashes).sort()).toEqual(["a", "b", "w"]);
    expect(index.entityHashes.w).toBe(
      await hashCloudBackupEntity({ id: "w", title: "Winner" }),
    );
    const { manifest } = (await readManifest(env, backupId))!;
    expect(manifest.entityCount).toBe(3);
    expect(manifest.revision).toBe(fixture.manifest.revision + 1);
  });

  it("lets the loser retry on the revision it was given", async () => {
    const fixture = await committedFixture();
    const { loser } = await raceDeltas(fixture);
    const { error } = await loser.json();
    const retry = await sendDelta(
      fixture,
      { lastPushedAt: error.lastPushedAt, revision: error.revision },
      [{ id: "l", title: "Loser" }],
    );
    expect(retry.status).toBe(200);
    expect(await entitiesOf(fixture)).toEqual({
      a: "A",
      b: "B",
      w: "Winner",
      l: "Loser",
    });
    expect(
      (await readManifest(fixture.env, fixture.backupId))!.manifest.revision,
    ).toBe(fixture.manifest.revision + 2);
  });

  it("refuses a full commit that authorised before a delta switched", async () => {
    const fixture = await committedFixture();
    const { env, backupId, ownerCode, manifest } = fixture;
    beforeManifestPut(env.BUCKET, async () => {
      await sendDelta(
        fixture,
        { lastPushedAt: manifest.lastPushedAt, revision: manifest.revision },
        [{ id: "d", title: "Delta" }],
      );
    });
    const full = await handleCommitCloudBackup(
      jsonRequest(
        {
          vaultTitle: "Vault",
          bundle: { entities: [{ id: "f", title: "Full" }], maps: [] },
        },
        ownerCode,
      ),
      env,
      backupId,
    );
    expect(full.status).toBe(409);
    expect((await full.json()).error).toMatchObject({
      code: "diverged",
      revision: manifest.revision + 1,
    });
    expect(await entitiesOf(fixture)).toEqual({ a: "A", b: "B", d: "Delta" });
  });

  it("does not prune assets when a commit loses", async () => {
    for (const kind of ["delta", "full"] as const) {
      const fixture = await committedFixture();
      const { env, backupId, ownerCode, manifest } = fixture;
      await env.BUCKET.put(getAssetKey(backupId, "existing"), "bytes");
      beforeManifestPut(env.BUCKET, async () => {
        await sendDelta(
          fixture,
          { lastPushedAt: manifest.lastPushedAt, revision: manifest.revision },
          [{ id: "w" }],
        );
      });
      const lost =
        kind === "delta"
          ? await sendDelta(
              fixture,
              {
                lastPushedAt: manifest.lastPushedAt,
                revision: manifest.revision,
              },
              [{ id: "l" }],
              { assetIds: [] },
            )
          : await handleCommitCloudBackup(
              jsonRequest(
                { vaultTitle: "V", bundle: { entities: [] }, assetIds: [] },
                ownerCode,
              ),
              env,
              backupId,
            );
      expect(lost.status).toBe(409);
      expect(
        await env.BUCKET.head(getAssetKey(backupId, "existing")),
      ).not.toBeNull();
    }
  });

  it("keeps the previous revision readable when the manifest write fails", async () => {
    const fixture = await committedFixture();
    const { env, backupId, ownerCode, manifest } = fixture;
    const before = await readManifest(env, backupId);
    const indexBefore = await (
      await handleGetCloudBackupIndex(ownerRequest(ownerCode), env, backupId)
    ).json();
    const bundleBefore = await bundleOf(fixture);
    const put = env.BUCKET.put.bind(env.BUCKET);
    vi.spyOn(env.BUCKET, "put").mockImplementation((async (
      key: string,
      ...rest: any[]
    ) => {
      if (key === getManifestKey(backupId)) throw new Error("R2 unavailable");
      return (put as any)(key, ...rest);
    }) as any);
    await expect(
      sendDelta(fixture, { lastPushedAt: manifest.lastPushedAt, revision: 1 }, [
        { id: "x", title: "X" },
      ]),
    ).rejects.toThrow("R2 unavailable");
    expect(await readManifest(env, backupId)).toEqual(before);
    expect(
      await (
        await handleGetCloudBackupIndex(ownerRequest(ownerCode), env, backupId)
      ).json(),
    ).toEqual(indexBefore);
    expect(await bundleOf(fixture)).toEqual(bundleBefore);
  });

  it("reads a backup stored at the legacy keys and accepts a first delta", async () => {
    const {
      env,
      backupId,
      ownerCode,
      ownerCode: _c,
      ...rest
    } = await createBackupFixture();
    const stored = (await readManifest(env, backupId))!;
    const manifest = {
      ...stored.manifest,
      schemaVersion: 2,
      shardCount: 256,
      entityCount: 2,
    };
    await writeManifest(
      env,
      backupId,
      manifest,
      stored.ownerCodeHash!,
      undefined,
      stored.etag,
    );
    await writeJson(env, absoluteKey(backupId, "bundle.json"), { maps: [] });
    await writeJson(env, getShardKey(backupId, "01"), {
      a: { id: "a", title: "A" },
    });
    await writeJson(env, getShardKey(backupId, "02"), {
      b: { id: "b", title: "B" },
    });
    await writeJson(env, getIndexKey(backupId), {
      entityHashes: { a: "ha", b: "hb" },
    });
    const fixture = { env, backupId, ownerCode, manifest, ...rest } as Fixture;

    expect(await entitiesOf(fixture)).toEqual({ a: "A", b: "B" });
    const first = await sendDelta(
      fixture,
      { lastPushedAt: manifest.lastPushedAt },
      [{ id: "c", title: "C" }],
    );
    expect(first.status).toBe(200);
    expect(await entitiesOf(fixture)).toEqual({ a: "A", b: "B", c: "C" });
    const objects = (await readManifest(env, backupId))!.objects!;
    expect(objects.shards!["01"]).toBe("entities/01.json");
  });

  it("never exposes the objects field in a response", async () => {
    const fixture = await committedFixture();
    const { env, backupId, ownerCode, manifest } = fixture;
    const delta = await (
      await sendDelta(
        fixture,
        { lastPushedAt: manifest.lastPushedAt, revision: manifest.revision },
        [{ id: "a", title: "Again" }],
      )
    ).json();
    const commit = await (
      await handleCommitCloudBackup(
        jsonRequest({ vaultTitle: "V", bundle: { entities: [] } }, ownerCode),
        env,
        backupId,
      )
    ).json();
    const bundle = (await bundleOf(fixture)).body;
    const status = await (
      await handleGetCloudBackupStatus(ownerRequest(ownerCode), env, backupId)
    ).json();
    for (const body of [delta, commit, bundle, status]) {
      expect(body).not.toHaveProperty("objects");
      expect(body.manifest ?? {}).not.toHaveProperty("objects");
    }
    expect(JSON.stringify([delta, commit, status])).not.toContain("commits/");
  });

  it("keeps one generation of grace and deletes the rest", async () => {
    const fixture = await committedFixture();
    const { env, backupId } = fixture;
    const generations: Array<Set<string>> = [];
    let base = {
      lastPushedAt: fixture.manifest.lastPushedAt,
      revision: fixture.manifest.revision,
    };
    for (const id of ["x", "y", "z"]) {
      const response = await sendDelta(fixture, base, [{ id, title: id }], {
        maps: [{ id }],
      });
      expect(response.status).toBe(200);
      const { manifest } = await response.json();
      base = {
        lastPushedAt: manifest.lastPushedAt,
        revision: manifest.revision,
      };
      generations.push(
        referencedKeys((await readManifest(env, backupId))!.objects!),
      );
    }
    const kept = new Set([...generations[1], ...generations[2]]);
    const prefix = `cloud-backup/${backupId}/`;
    const staged = [...env.BUCKET.store.keys()]
      .filter((key) => key.startsWith(`${prefix}commits/`))
      .map((key) => key.slice(prefix.length));
    for (const key of staged) expect(kept.has(key)).toBe(true);
    for (const relative of generations[2]) {
      expect(env.BUCKET.store.has(prefix + relative)).toBe(true);
    }
    expect(env.BUCKET.store.has(`${prefix}bundle.json`)).toBe(false);
  });

  it("counts only reachable bytes and assets in the next sizeBytes", async () => {
    const fixture = await committedFixture();
    const { env, backupId, manifest } = fixture;
    await env.BUCKET.put(getAssetKey(backupId, "pic"), "12345");
    const orphan = `cloud-backup/${backupId}/commits/99-orphan/bundle.json`;
    await env.BUCKET.put(orphan, "x".repeat(5000));
    const { loser } = await raceDeltas(fixture);
    expect(loser.status).toBe(409);
    const current = (await readManifest(env, backupId))!;
    const next = await sendDelta(
      fixture,
      {
        lastPushedAt: current.manifest.lastPushedAt,
        revision: cloudBackupRevisionOf(current.manifest),
      },
      [{ id: "n", title: "N" }],
    );
    expect(next.status).toBe(200);
    const { manifest: committed } = await next.json();
    const objects = (await readManifest(env, backupId))!.objects!;
    let expected = 5;
    for (const relative of referencedKeys(objects)) {
      expected += (await env.BUCKET.head(
        `cloud-backup/${backupId}/${relative}`,
      ))!.size;
    }
    expect(committed.sizeBytes).toBe(expected);
    expect(committed.sizeBytes).toBeLessThan(5000);
    expect(manifest.sizeBytes).toBeGreaterThan(0);
    expect(await env.BUCKET.head(orphan)).not.toBeNull();
  });

  it("fails a restore instead of dropping entities of a missing shard", async () => {
    const fixture = await committedFixture();
    const { env, backupId } = fixture;
    const objects = (await readManifest(env, backupId))!.objects!;
    const [shard] = Object.values(objects.shards!);
    await env.BUCKET.delete(absoluteKey(backupId, shard));
    const { status, body } = await bundleOf(fixture);
    expect(status).not.toBe(200);
    expect(body.bundle).toBeUndefined();

    await env.BUCKET.delete(absoluteKey(backupId, objects.index!));
    const index = await handleGetCloudBackupIndex(
      ownerRequest(fixture.ownerCode),
      env,
      backupId,
    );
    expect(index.status).not.toBe(200);
  });

  it("opens a backup create-only", async () => {
    const env = { BUCKET: new Bucket() };
    env.BUCKET.injectConflicts(1);
    const response = await handleEnableCloudBackup(
      jsonRequest({ vaultTitle: "Vault" }),
      env,
    );
    expect(response.status).not.toBe(201);
    expect(await response.json()).not.toHaveProperty("ownerCode");
    expect(env.BUCKET.store.size).toBe(0);
  });

  it("re-issues a code without losing objects or rolling back", async () => {
    const fixture = await committedFixture();
    const { backupId } = fixture;
    const env = { ...fixture.env, CLOUD_BACKUP_ADMIN_TOKEN: "admin" };
    const objects = (await readManifest(env, backupId))!.objects;
    const before = await entitiesOf(fixture);

    const reissued = await handleCloudBackupReissueCode(
      ownerRequest("admin", { method: "POST" }),
      env,
      backupId,
    );
    const { ownerCode } = await reissued.json();
    expect((await readManifest(env, backupId))!.objects).toEqual(objects);
    expect(await entitiesOf({ ...fixture, ownerCode })).toEqual(before);

    const stored = env.BUCKET.store.get(getManifestKey(backupId));
    env.BUCKET.injectConflicts(3);
    const refused = await handleCloudBackupReissueCode(
      ownerRequest("admin", { method: "POST" }),
      env,
      backupId,
    );
    expect(refused.status).toBe(409);
    expect(env.BUCKET.store.get(getManifestKey(backupId))).toBe(stored);
  });
});
