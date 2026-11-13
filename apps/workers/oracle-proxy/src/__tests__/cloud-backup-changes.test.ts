import { describe, expect, it } from "vitest";
import { handleCloudBackupRoutes } from "../cloud-backup-routes";
import { handleCloudBackupDelta } from "../cloud-backup-delta";
import { handleCommitCloudBackup } from "../cloud-backup-snapshot";
import {
  getIndexKey,
  getShardKey,
  readManifest,
  writeManifest,
} from "../cloud-backup-storage";
import { createBackupFixture, jsonRequest } from "./cloud-backup-fixtures";

type Fixture = Awaited<ReturnType<typeof createBackupFixture>>;

const commit = async (f: Fixture, entities: unknown[]) =>
  (
    await (
      await handleCommitCloudBackup(
        jsonRequest({ vaultTitle: "V", bundle: { entities } }, f.ownerCode),
        f.env,
        f.backupId,
      )
    ).json()
  ).manifest;

async function delta(
  f: Fixture,
  body: { upserts?: unknown[]; deletes?: string[] },
) {
  const { manifest } = (await readManifest(f.env, f.backupId))!;
  const response = await handleCloudBackupDelta(
    jsonRequest(
      {
        vaultTitle: "V",
        baseLastPushedAt: manifest.lastPushedAt,
        baseRevision: manifest.revision,
        upserts: [],
        deletes: [],
        ...body,
      },
      f.ownerCode,
    ),
    f.env,
    f.backupId,
  );
  expect(response.status).toBe(200);
}

function feed(f: Fixture, query: string, key: string | null = f.ownerCode) {
  return handleCloudBackupRoutes(
    new Request(
      `https://example.test/api/cloud-backup/${f.backupId}/changes${query}`,
      { headers: key ? { Authorization: `Bearer ${key}` } : {} },
    ),
    f.env as never,
    `/api/cloud-backup/${f.backupId}/changes`,
  );
}

/** Revision 5, feedHorizon 3: rev 5 touched "e5" and removed "gone". */
async function atRevisionFive() {
  const f = await createBackupFixture();
  await commit(f, [
    { id: "a", title: "A" },
    { id: "gone", title: "Gone" },
  ]);
  await delta(f, { upserts: [{ id: "b", title: "B" }] });
  await delta(f, { upserts: [{ id: "c", title: "C" }] });
  const stored = (await readManifest(f.env, f.backupId))!;
  await writeManifest(
    f.env,
    f.backupId,
    { ...stored.manifest, feedHorizon: 3 },
    stored.ownerCodeHash!,
    stored.objects,
    stored.etag,
  );
  await delta(f, { upserts: [{ id: "d", title: "D" }] });
  await delta(f, { upserts: [{ id: "e5", title: "E5" }], deletes: ["gone"] });
  return f;
}

describe("cloud backup change feed", () => {
  it("returns only what changed after since, with the current revision", async () => {
    const f = await atRevisionFive();
    const body = await (await feed(f, "?since=4"))!.json();
    expect(body.status).toBe("changes");
    expect(body.revision).toBe(5);
    expect(body.entities.map((e: any) => e.entity.id)).toEqual(["e5"]);
    expect(body.entities[0].meta.rev).toBe(5);
    expect(body.tombstones).toEqual([
      expect.objectContaining({ id: "gone", rev: 5, title: "Gone" }),
    ]);
  });

  it("answers empty at the current revision and resync outside the feed", async () => {
    const f = await atRevisionFive();
    expect(await (await feed(f, "?since=5"))!.json()).toEqual({
      status: "changes",
      revision: 5,
      entities: [],
      tombstones: [],
    });
    for (const since of [2, 6]) {
      expect(await (await feed(f, `?since=${since}`))!.json()).toEqual({
        status: "resync",
        revision: 5,
      });
    }
    const all = await (await feed(f, "?since=0"))!.json();
    expect(all.entities.map((e: any) => e.entity.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e5",
    ]);
    expect(all.tombstones).toHaveLength(1);
  });

  it("resyncs below the horizon after a full upload", async () => {
    const f = await atRevisionFive();
    const manifest = await commit(f, [{ id: "a", title: "A" }]);
    expect(manifest.feedHorizon).toBe(manifest.revision);
    expect(
      await (await feed(f, `?since=${manifest.revision - 1}`))!.json(),
    ).toEqual({ status: "resync", revision: manifest.revision });
  });

  it("answers a wrong or missing key like the index route", async () => {
    const f = await atRevisionFive();
    const index = (key?: string) =>
      handleCloudBackupRoutes(
        new Request(
          `https://example.test/api/cloud-backup/${f.backupId}/index`,
          {
            headers: key ? { Authorization: `Bearer ${key}` } : {},
          },
        ),
        f.env as never,
        `/api/cloud-backup/${f.backupId}/index`,
      );
    for (const key of ["wrong", null]) {
      const [changes, expected] = await Promise.all([
        feed(f, "?since=0", key),
        index(key ?? undefined),
      ]);
      expect(changes!.status).toBe(expected!.status);
      expect(await changes!.text()).toBe(await expected!.text());
    }
  });

  it("rejects an invalid since with 400", async () => {
    const f = await atRevisionFive();
    for (const query of ["?since=-1", "?since=1.5", "?since=abc", ""]) {
      const response = await feed(f, query);
      expect(response!.status).toBe(400);
      expect(await response!.json()).toEqual({
        error: { message: "Invalid since" },
      });
    }
  });

  it("serves since=0 for a v2 backup with no revision", async () => {
    const f = await createBackupFixture();
    await commit(f, [{ id: "a", title: "A" }]);
    const stored = (await readManifest(f.env, f.backupId))!;
    const { revision: _r, feedHorizon: _h, ...legacy } = stored.manifest;
    const prefix = `cloud-backup/${f.backupId}/`;
    for (const [relative, legacyKey] of [
      [stored.objects!.index!, getIndexKey(f.backupId)],
      [
        stored.objects!.shards!["00"] ??
          Object.values(stored.objects!.shards!)[0],
        null,
      ],
    ] as const) {
      const object = await f.env.BUCKET.get(prefix + relative);
      const value = JSON.parse(await object.text());
      if (legacyKey) {
        await f.env.BUCKET.put(
          legacyKey,
          JSON.stringify({ entityHashes: value.entityHashes }),
        );
      } else {
        const name = Object.keys(stored.objects!.shards!)[0];
        await f.env.BUCKET.put(
          getShardKey(f.backupId, name),
          JSON.stringify(value),
        );
      }
    }
    await writeManifest(
      f.env,
      f.backupId,
      legacy,
      stored.ownerCodeHash!,
      undefined,
      stored.etag,
    );
    const body = await (await feed(f, "?since=0"))!.json();
    expect(body.status).toBe("changes");
    expect(body.revision).toBe(0);
    expect(body.entities).toEqual([{ entity: { id: "a", title: "A" } }]);
  });

  it("answers 404 to a non-GET method", async () => {
    const f = await atRevisionFive();
    const response = await handleCloudBackupRoutes(
      new Request(
        `https://example.test/api/cloud-backup/${f.backupId}/changes?since=0`,
        { method: "POST", headers: { Authorization: `Bearer ${f.ownerCode}` } },
      ),
      f.env as never,
      `/api/cloud-backup/${f.backupId}/changes`,
    );
    expect(response!.status).toBe(404);
  });

  it("never exposes objects or trash content", async () => {
    const f = await atRevisionFive();
    const text = await (await feed(f, "?since=0"))!.text();
    expect(text).not.toContain('"objects"');
    expect(text).not.toContain("commits/");
    expect(text).not.toContain("entityHashes");
    expect(JSON.parse(text).tombstones[0]).not.toHaveProperty("content");
  });

  it("fails as incomplete when a referenced shard is missing", async () => {
    const f = await atRevisionFive();
    const stored = (await readManifest(f.env, f.backupId))!;
    await f.env.BUCKET.delete(
      `cloud-backup/${f.backupId}/${Object.values(stored.objects!.shards!)[0]}`,
    );
    expect((await feed(f, "?since=0"))!.status).toBe(500);
  });
});
