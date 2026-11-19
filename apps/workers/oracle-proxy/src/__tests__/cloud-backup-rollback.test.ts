import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLOUD_BACKUP_LIMITS } from "../../../../../packages/schema/src/publishing";
import { handleCloudBackupRoutes } from "../cloud-backup-routes";
import {
  absoluteKey,
  getAssetKey,
  getBackupPrefix,
  readJson,
  readManifest,
  referencedKeys,
} from "../cloud-backup-storage";
import { createBackupFixture, readCurrent } from "./cloud-backup-fixtures";

type Fixture = Awaited<ReturnType<typeof createBackupFixture>> & {
  editorToken: string;
};

const device = "device-rollback-01";
const M1 = "11111111-1111-4111-8111-111111111111";
const M2 = "22222222-2222-4222-8222-222222222222";
const M3 = "44444444-4444-4444-8444-444444444444";
const C1 = "33333333-3333-4333-8333-333333333333";
const DAY1 = "2026-11-01";

const at = (iso: string) => vi.setSystemTime(new Date(iso));

async function call(
  fx: Fixture,
  method: string,
  path: string,
  options: { key?: string; body?: unknown; raw?: Uint8Array } = {},
) {
  const headers: Record<string, string> = { "X-Codex-Device-Id": device };
  if (options.key) headers.Authorization = `Bearer ${options.key}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const pathname = `/api/cloud-backup/${fx.backupId}${path.split("?")[0]}`;
  return (await handleCloudBackupRoutes(
    new Request(`https://example.test/api/cloud-backup/${fx.backupId}${path}`, {
      method,
      headers,
      body:
        options.raw ??
        (options.body === undefined ? undefined : JSON.stringify(options.body)),
    }),
    fx.env as never,
    pathname,
  ))!;
}

async function push(fx: Fixture, body: Record<string, unknown>) {
  const { manifest } = (await readManifest(fx.env, fx.backupId))!;
  return call(fx, "POST", "/delta", {
    key: fx.ownerCode,
    body: {
      vaultTitle: "V",
      baseLastPushedAt: manifest.lastPushedAt,
      baseRevision: manifest.revision,
      upserts: [],
      deletes: [],
      ...body,
    },
  });
}

const revisionOf = async (fx: Fixture) =>
  (await readManifest(fx.env, fx.backupId))!.manifest.revision!;

const rollback = (fx: Fixture, body: unknown, key = fx.ownerCode) =>
  call(fx, "POST", "/rollback", { key, body });

const feed = async (fx: Fixture, since: number) =>
  (
    await call(fx, "GET", `/changes?since=${since}`, { key: fx.ownerCode })
  ).json();

const keys = (fx: Fixture) => [...fx.env.BUCKET.store.keys()].sort();

/**
 * Day 1 holds the point: a1, b, c, f; maps M1, M2; canvas C1; one asset.
 * Day 2 edits c, adds d, deletes b, edits M1, adds M3, deletes M2 and C1,
 * and prunes the asset.
 */
async function sharedWithPoint(): Promise<Fixture> {
  at(`${DAY1}T10:00:00Z`);
  const fx = (await createBackupFixture()) as Fixture;
  await call(fx, "PUT", "/assets/pic", {
    key: fx.ownerCode,
    raw: new Uint8Array([1, 2, 3]),
  });
  await call(fx, "POST", "/commit", {
    key: fx.ownerCode,
    body: {
      vaultTitle: "V",
      bundle: {
        entities: ["a", "b", "c", "f"].map((id) => ({ id, title: id })),
        maps: [
          { id: M1, name: "Atlas" },
          { id: M2, name: "Other" },
        ],
        canvases: [{ id: C1, name: "Plot", slug: "plot" }],
        sessionJournals: [{ id: "j" }],
        adventures: [{ id: "adv" }],
        assetManifest: [],
      },
      assetIds: ["pic"],
    },
  });
  const on = await call(fx, "POST", "/sharing", { key: fx.ownerCode });
  fx.editorToken = ((await on.json()) as any).editorToken;
  await push(fx, { upserts: [{ id: "a", title: "a1" }], assetIds: ["pic"] });
  return fx;
}

async function dayTwo(fx: Fixture) {
  at("2026-11-02T10:00:00Z");
  const response = await push(fx, {
    upserts: [
      { id: "c", title: "c2" },
      { id: "d", title: "d" },
    ],
    deletes: ["b"],
    mapUpserts: [
      { item: { id: M1, name: "Atlas2" } },
      { item: { id: M3, name: "New" } },
    ],
    mapDeletes: [M2],
    canvasDeletes: [C1],
    assetIds: [],
  });
  expect(response.status).toBe(200);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("owner rollback", () => {
  it("writes the point's content as the next revision", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const before = await revisionOf(fx);
    at("2026-11-03T10:00:00Z");
    const response = await rollback(fx, { date: DAY1, baseRevision: before });
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.rollback).toEqual({ changed: 2, returning: 3, trashed: 2 });
    expect(body.manifest.revision).toBe(before + 1);
    expect(await revisionOf(fx)).toBe(before + 1);

    const bundle = (
      (await (
        await call(fx, "GET", "/bundle", { key: fx.ownerCode })
      ).json()) as any
    ).bundle;
    const titles = Object.fromEntries(
      bundle.entities.map((e: any) => [e.id, e.title]),
    );
    expect(titles).toEqual({ a: "a1", b: "b", c: "c", f: "f" });
    expect(bundle.maps.map((m: any) => m.id).sort()).toEqual([M1, M2]);
    expect(bundle.maps.find((m: any) => m.id === M1).name).toBe("Atlas");
    expect(bundle.canvases.map((c: any) => c.id)).toEqual([C1]);
  });

  it("tombstones what the point lacks and keeps it restorable from the trash", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const before = await revisionOf(fx);
    await rollback(fx, { date: DAY1, baseRevision: before });

    const list = (await (
      await call(fx, "GET", "/trash", { key: fx.ownerCode })
    ).json()) as any;
    const trashed = list.items.map((item: any) => item.id).sort();
    expect(trashed).toEqual([M3, "d"].sort());
    expect(list.items.every((item: any) => item.restorable)).toBe(true);
    const kept = (await (
      await call(fx, "GET", "/trash/d", { key: fx.ownerCode })
    ).json()) as any;
    expect(kept.entity).toEqual({ id: "d", title: "d" });
    expect(kept.tombstone).toMatchObject({
      rev: before + 1,
      deletedBy: "owner",
    });
    const index = await readCurrent(fx.env, fx.backupId, "index");
    expect(index.tombstones.d.rev).toBe(before + 1);
  });

  it("brings back what was deleted and clears its tombstone", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const before = await revisionOf(fx);
    await rollback(fx, { date: DAY1, baseRevision: before });
    const index = await readCurrent(fx.env, fx.backupId, "index");
    for (const id of ["b", M2, C1])
      expect(index.tombstones?.[id]).toBeUndefined();
    expect(index.entityMeta.b.rev).toBe(before + 1);
    const list = (await (
      await call(fx, "GET", "/trash", { key: fx.ownerCode })
    ).json()) as any;
    expect(list.items.map((item: any) => item.id)).not.toContain("b");
  });

  it("feeds members exactly the changed, returning and trashed ids", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const before = await revisionOf(fx);
    await rollback(fx, { date: DAY1, baseRevision: before });
    const body = await feed(fx, before);
    expect(body.entities.map((e: any) => e.entity.id).sort()).toEqual([
      "b",
      "c",
    ]);
    expect(body.maps.map((m: any) => m.item.id).sort()).toEqual([M1, M2]);
    expect(body.canvases.map((c: any) => c.item.id)).toEqual([C1]);
    expect(body.tombstones.map((t: any) => t.id).sort()).toEqual(
      [M3, "d"].sort(),
    );
  });

  it("answers an editor like a wrong key, for a dry run and a commit", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const revision = await revisionOf(fx);
    const snapshot = keys(fx);
    const wrong = await rollback(
      fx,
      { date: DAY1, dryRun: true },
      "f".repeat(64),
    );
    for (const body of [
      { date: DAY1, dryRun: true },
      { date: DAY1, baseRevision: revision },
    ]) {
      const response = await rollback(fx, body, fx.editorToken);
      expect(response.status).toBe(wrong.status);
      expect(await response.text()).toBe(await wrong.clone().text());
    }
    expect(keys(fx)).toEqual(snapshot);
    expect(await revisionOf(fx)).toBe(revision);
  });

  it("writes nothing on a dry run and reports the counts the commit then writes", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const revision = await revisionOf(fx);
    const etag = (await fx.env.BUCKET.head(
      `${getBackupPrefix(fx.backupId)}manifest.json`,
    ))!.etag;
    const snapshot = keys(fx);
    const preview = (await (
      await rollback(fx, { date: DAY1, dryRun: true })
    ).json()) as any;
    expect(preview.preview).toEqual({
      date: DAY1,
      revision,
      changed: 2,
      returning: 3,
      trashed: 2,
    });
    expect(keys(fx)).toEqual(snapshot);
    expect(
      (await fx.env.BUCKET.head(
        `${getBackupPrefix(fx.backupId)}manifest.json`,
      ))!.etag,
    ).toBe(etag);
    const done = (await (
      await rollback(fx, { date: DAY1, baseRevision: revision })
    ).json()) as any;
    expect(done.rollback).toEqual({ changed: 2, returning: 3, trashed: 2 });
  });

  it("leaves the manifest and no staged keys after a storage failure", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const revision = await revisionOf(fx);
    const snapshot = keys(fx);
    const put = fx.env.BUCKET.put.bind(fx.env.BUCKET);
    vi.spyOn(fx.env.BUCKET, "put").mockImplementation((async (
      key: string,
      ...rest: any[]
    ) => {
      if (key.includes("/entities/")) throw new Error("R2 unavailable");
      return (put as any)(key, ...rest);
    }) as any);
    const response = await rollback(fx, { date: DAY1, baseRevision: revision });
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(await revisionOf(fx)).toBe(revision);
    expect(keys(fx)).toEqual(snapshot);
  });

  it("discards what it staged when it loses the manifest switch", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const revision = await revisionOf(fx);
    const snapshot = keys(fx);
    const put = fx.env.BUCKET.put.bind(fx.env.BUCKET);
    let lost = false;
    vi.spyOn(fx.env.BUCKET, "put").mockImplementation((async (
      key: string,
      ...rest: any[]
    ) => {
      if (!lost && key.endsWith("/manifest.json")) {
        lost = true;
        return null;
      }
      return (put as any)(key, ...rest);
    }) as any);
    const response = await rollback(fx, { date: DAY1, baseRevision: revision });
    expect(response.status).toBe(409);
    expect(((await response.json()) as any).error.code).toBe("diverged");
    expect(await revisionOf(fx)).toBe(revision);
    // A restored asset is harmless to readers and may stay; staged objects may not.
    expect(
      keys(fx).filter((key) => key !== getAssetKey(fx.backupId, "pic")),
    ).toEqual(snapshot);
  });

  it("keeps what the manifest points at when its write is saved and then throws", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const revision = await revisionOf(fx);
    const put = fx.env.BUCKET.put.bind(fx.env.BUCKET);
    let thrown = false;
    vi.spyOn(fx.env.BUCKET, "put").mockImplementation((async (
      key: string,
      ...rest: any[]
    ) => {
      const result = await (put as any)(key, ...rest);
      if (!thrown && key.endsWith("/manifest.json")) {
        thrown = true;
        throw new Error("timeout after the write was saved");
      }
      return result;
    }) as any);
    const response = await rollback(fx, { date: DAY1, baseRevision: revision });
    expect(response.status).toBeGreaterThanOrEqual(500);

    const { objects } = (await readManifest(fx.env, fx.backupId))!;
    expect(await revisionOf(fx)).toBe(revision + 1);
    for (const relative of referencedKeys(objects!)) {
      expect(
        await fx.env.BUCKET.head(absoluteKey(fx.backupId, relative)),
      ).not.toBeNull();
    }
    const bundle = (
      (await (
        await call(fx, "GET", "/bundle", { key: fx.ownerCode })
      ).json()) as any
    ).bundle;
    expect(bundle.entities.map((e: any) => e.id).sort()).toEqual([
      "a",
      "b",
      "c",
      "f",
    ]);
  });

  it("refuses a stale base revision and an unknown date", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const revision = await revisionOf(fx);
    const stale = await rollback(fx, {
      date: DAY1,
      baseRevision: revision - 1,
    });
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as any).error.code).toBe("diverged");
    const gone = await rollback(fx, { date: "2020-01-01", dryRun: true });
    expect(gone.status).toBe(404);
    expect(((await gone.json()) as any).error).toEqual({
      code: "restore_point_not_found",
      message: "That restore point no longer exists.",
    });
    expect(
      (await rollback(fx, { date: "not a date", dryRun: true })).status,
    ).toBe(400);
    expect((await rollback(fx, { date: DAY1 })).status).toBe(400);
  });

  it("keeps the point and its objects, so it can be rolled back to again", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const point = (await readJson<any>(
      fx.env,
      `${getBackupPrefix(fx.backupId)}restore-points/points/${DAY1}.json`,
    ))!;
    await rollback(fx, { date: DAY1, baseRevision: await revisionOf(fx) });
    for (const relative of referencedKeys(point.objects)) {
      expect(
        await fx.env.BUCKET.head(absoluteKey(fx.backupId, relative)),
      ).not.toBeNull();
    }
    await dayTwo2(fx);
    const again = await rollback(fx, {
      date: DAY1,
      baseRevision: await revisionOf(fx),
    });
    expect(again.status).toBe(200);
  });

  it("serves the point's preserved bytes when the same asset id was overwritten", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    expect(
      await fx.env.BUCKET.head(getAssetKey(fx.backupId, "pic")),
    ).toBeNull();
    await call(fx, "PUT", "/assets/pic", {
      key: fx.ownerCode,
      raw: new Uint8Array([9, 8, 7]),
    });
    await rollback(fx, { date: DAY1, baseRevision: await revisionOf(fx) });
    const restored = await call(fx, "GET", "/assets/pic", {
      key: fx.ownerCode,
    });
    expect(Array.from(new Uint8Array(await restored.arrayBuffer()))).toEqual([
      1, 2, 3,
    ]);
    expect(
      Array.from(
        (await fx.env.BUCKET.get(getAssetKey(fx.backupId, "pic")))!
          .body as Uint8Array,
      ),
    ).toEqual([9, 8, 7]);

    await call(fx, "PUT", "/assets/pic", {
      key: fx.ownerCode,
      raw: new Uint8Array([4, 5, 6]),
    });
    const uploaded = await call(fx, "GET", "/assets/pic", {
      key: fx.ownerCode,
    });
    expect(Array.from(new Uint8Array(await uploaded.arrayBuffer()))).toEqual([
      4, 5, 6,
    ]);
  });

  it("leaves session journals and adventures as they are", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    await rollback(fx, { date: DAY1, baseRevision: await revisionOf(fx) });
    const bundle = await readCurrent(fx.env, fx.backupId, "bundle");
    expect(bundle.sessionJournals).toEqual([{ id: "j" }]);
    expect(bundle.adventures).toEqual([{ id: "adv" }]);
  });

  it("reports trashEvicted on dryRun preview and commit when rollback exceeds maxTrashBytes, and omits it otherwise", async () => {
    const fx = await sharedWithPoint();
    await dayTwo(fx);
    const revBefore = await revisionOf(fx);

    const normalPreview = await rollback(fx, { date: DAY1, dryRun: true });
    expect(normalPreview.status).toBe(200);
    expect(
      ((await normalPreview.json()) as any).preview.trashEvicted,
    ).toBeUndefined();

    const limits = CLOUD_BACKUP_LIMITS as { maxTrashBytes: number };
    const original = limits.maxTrashBytes;
    limits.maxTrashBytes = 10;
    try {
      const previewRes = await rollback(fx, { date: DAY1, dryRun: true });
      expect(previewRes.status).toBe(200);
      const previewJson = (await previewRes.json()) as any;
      expect(previewJson.preview.trashEvicted).toMatchObject({
        evictedCount: expect.any(Number),
        usedBytes: 0,
        maxBytes: 10,
      });
      expect(
        previewJson.preview.trashEvicted.evictedCount,
      ).toBeGreaterThanOrEqual(1);

      const commitRes = await rollback(fx, {
        date: DAY1,
        baseRevision: revBefore,
      });
      expect(commitRes.status).toBe(200);
      const commitJson = (await commitRes.json()) as any;
      expect(commitJson.trashEvicted).toEqual(previewJson.preview.trashEvicted);
    } finally {
      limits.maxTrashBytes = original;
    }
  });
});

/** A further change, so a second rollback has something to do. */
async function dayTwo2(fx: Fixture) {
  at("2026-11-04T10:00:00Z");
  expect((await push(fx, { upserts: [{ id: "f", title: "f2" }] })).status).toBe(
    200,
  );
}
