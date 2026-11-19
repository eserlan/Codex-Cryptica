import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleCloudBackupRoutes } from "../cloud-backup-routes";
import { handleCloudBackupDelta } from "../cloud-backup-delta";
import { handleCommitCloudBackup } from "../cloud-backup-snapshot";
import { handleCloudBackupAssetUpload } from "../cloud-backup-assets";
import {
  handleCloudBackupSharingOff,
  handleCloudBackupSharingOn,
} from "../cloud-backup-sharing";
import {
  getAssetKey,
  getBackupPrefix,
  readJson,
  readManifest,
  referencedKeys,
  absoluteKey,
} from "../cloud-backup-storage";
import { cloudBackupShardOf } from "../../../../../packages/schema/src/publishing";
import {
  createBackupFixture,
  jsonRequest,
  ownerRequest,
} from "./cloud-backup-fixtures";

type Fixture = Awaited<ReturnType<typeof createBackupFixture>> & {
  editorToken?: string;
};

const IDS = ["e1", "e2", "e3", "e4", "e5", "e6"];
const DAY = 86_400_000;

const at = (iso: string) => vi.setSystemTime(new Date(iso));
const dayAt = (base: string, offset: number) =>
  new Date(Date.parse(`${base}T10:00:00Z`) + offset * DAY).toISOString();

const pointKey = (fx: Fixture, date: string) =>
  `${getBackupPrefix(fx.backupId)}restore-points/points/${date}.json`;
const preservedKey = (fx: Fixture, id: string, etag: string) =>
  `${getBackupPrefix(fx.backupId)}restore-points/assets/${id}/${etag}`;
const keysUnder = (fx: Fixture, part: string) =>
  [...fx.env.BUCKET.store.keys()].filter((key) => key.includes(part));

const readPoint = (fx: Fixture, date: string) =>
  readJson<any>(fx.env, pointKey(fx, date));

async function snapshot(
  fx: Fixture,
  titles: Record<string, string>,
  assetIds: string[] = [],
) {
  return handleCommitCloudBackup(
    jsonRequest(
      {
        vaultTitle: "Vault",
        bundle: {
          entities: Object.entries(titles).map(([id, title]) => ({
            id,
            title,
          })),
        },
        assetIds,
      },
      fx.ownerCode,
    ),
    fx.env,
    fx.backupId,
  );
}

async function delta(
  fx: Fixture,
  body: {
    upserts?: Array<{ id: string; title: string }>;
    deletes?: string[];
    assetIds?: string[];
  },
) {
  const { manifest } = (await readManifest(fx.env, fx.backupId))!;
  return handleCloudBackupDelta(
    jsonRequest(
      {
        vaultTitle: "Vault",
        baseLastPushedAt: manifest.lastPushedAt,
        upserts: [],
        deletes: [],
        ...body,
      },
      fx.ownerCode,
    ),
    fx.env,
    fx.backupId,
  );
}

const edit = (fx: Fixture, id: string, title: string, assetIds?: string[]) =>
  delta(fx, { upserts: [{ id, title }], ...(assetIds ? { assetIds } : {}) });

const upload = (fx: Fixture, id: string, bytes: number[]) =>
  handleCloudBackupAssetUpload(
    ownerRequest(fx.ownerCode, { method: "PUT", body: new Uint8Array(bytes) }),
    fx.env,
    fx.backupId,
    id,
  );

/** A backup holding e1..e6 and one asset, with sharing already on. */
async function sharedFixture(day = "2026-11-01"): Promise<Fixture> {
  at(dayAt(day, 0));
  const fx: Fixture = await createBackupFixture();
  await snapshot(fx, Object.fromEntries(IDS.map((id) => [id, id])), ["pic"]);
  await upload(fx, "pic", [1, 2, 3]);
  const on = await handleCloudBackupSharingOn(
    ownerRequest(fx.ownerCode, { method: "POST" }),
    fx.env,
    fx.backupId,
  );
  fx.editorToken = ((await on.json()) as any).editorToken;
  return fx;
}

async function contentOf(fx: Fixture, objects: any) {
  const content: Record<string, string> = {};
  for (const relative of referencedKeys(objects)) {
    const object = await fx.env.BUCKET.get(absoluteKey(fx.backupId, relative));
    content[relative] = object ? await object.text() : "<missing>";
  }
  return content;
}

async function assetBytes(fx: Fixture, point: any, id: string) {
  const etag = point.assets[id];
  const live = await fx.env.BUCKET.get(getAssetKey(fx.backupId, id));
  const object =
    live?.etag === etag
      ? live
      : await fx.env.BUCKET.get(preservedKey(fx, id, etag));
  return object ? Array.from(object.body as Uint8Array) : null;
}

async function route(
  fx: Fixture,
  method: string,
  path: string,
  key?: string,
  device?: string,
) {
  const pathname = `/api/cloud-backup/${fx.backupId}${path}`;
  const headers: Record<string, string> = {};
  if (key) headers.Authorization = `Bearer ${key}`;
  if (device) headers["X-Codex-Device-Id"] = device;
  const response = await handleCloudBackupRoutes(
    new Request(`https://example.test${pathname}`, { method, headers }),
    fx.env as any,
    pathname,
  );
  return response!;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("taking restore points", () => {
  it("takes a point on the first delta commit of the UTC day", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T00:00:01Z");
    expect(await edit(fx, "e1", "one")).toMatchObject({ status: 200 });
    const { manifest, objects } = (await readManifest(fx.env, fx.backupId))!;
    const point = await readPoint(fx, "2026-11-14");
    expect(point).toMatchObject({
      date: "2026-11-14",
      revision: manifest.revision,
      entityCount: manifest.entityCount,
      objects,
    });
    expect(point.assets).toEqual({ pic: expect.any(String) });
    expect(Date.parse(point.takenAt)).not.toBeNaN();
  });

  it("takes none on later commits the same day", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one");
    const before = await fx.env.BUCKET.head(pointKey(fx, "2026-11-14"));
    at("2026-11-14T23:59:59Z");
    await edit(fx, "e2", "two");
    await edit(fx, "e3", "three");
    expect((await fx.env.BUCKET.head(pointKey(fx, "2026-11-14")))!.etag).toBe(
      before!.etag,
    );
    expect(keysUnder(fx, "restore-points/points/")).toEqual([
      pointKey(fx, "2026-11-14"),
    ]);
  });

  it("does not accept a later same-day commit before the first point is published", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    let entered!: () => void;
    let resume!: () => void;
    const reachedPoint = new Promise<void>((resolve) => (entered = resolve));
    const paused = new Promise<void>((resolve) => (resume = resolve));
    const bucket = fx.env.BUCKET;
    const head = bucket.head.bind(bucket);
    let delayed = false;
    bucket.head = async (key: string) => {
      if (!delayed && key === pointKey(fx, "2026-11-14")) {
        delayed = true;
        entered();
        await paused;
      }
      return head(key);
    };

    const first = edit(fx, "e1", "first");
    await reachedPoint;
    const second = await edit(fx, "e2", "second");
    expect(second.status).toBe(503);
    resume();
    expect((await first).status).toBe(200);
    bucket.head = head;

    const point = await readPoint(fx, "2026-11-14");
    const { manifest } = (await readManifest(fx.env, fx.backupId))!;
    expect(point.revision).toBe(manifest.revision);
    expect(point.revision).toBe(2);
  });

  it("takes no point for a day without commits", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one");
    at("2026-11-17T08:00:00Z");
    expect(keysUnder(fx, "restore-points/points/")).toHaveLength(1);
    await edit(fx, "e1", "two");
    expect(
      keysUnder(fx, "restore-points/points/").map((key) =>
        key.slice(key.lastIndexOf("/") + 1),
      ),
    ).toEqual(["2026-11-14.json", "2026-11-17.json"]);
  });

  it("counts a full snapshot commit", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    expect((await snapshot(fx, { e1: "x", e2: "y" }, ["pic"])).status).toBe(
      200,
    );
    const { manifest, objects } = (await readManifest(fx.env, fx.backupId))!;
    expect(await readPoint(fx, "2026-11-14")).toMatchObject({
      revision: manifest.revision,
      entityCount: 2,
      objects,
    });
  });

  it("takes no point for an unshared backup, and none once sharing is off", async () => {
    at("2026-11-01T08:00:00Z");
    const plain: Fixture = await createBackupFixture();
    await snapshot(plain, { e1: "a" });
    for (let day = 1; day <= 3; day++) {
      at(dayAt("2026-11-01", day));
      await edit(plain, "e1", `v${day}`);
    }
    expect(keysUnder(plain, "restore-points/")).toEqual([]);

    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one");
    await handleCloudBackupSharingOff(
      ownerRequest(fx.ownerCode, { method: "DELETE" }),
      fx.env,
      fx.backupId,
    );
    const before = await fx.env.BUCKET.head(pointKey(fx, "2026-11-14"));
    at("2026-11-15T08:00:00Z");
    await edit(fx, "e1", "two");
    expect(keysUnder(fx, "restore-points/points/")).toEqual([
      pointKey(fx, "2026-11-14"),
    ]);
    expect((await fx.env.BUCKET.head(pointKey(fx, "2026-11-14")))!.etag).toBe(
      before!.etag,
    );
  });

  it("does not fail the commit when the point cannot be written", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    const put = fx.env.BUCKET.put.bind(fx.env.BUCKET);
    fx.env.BUCKET.put = (key: string, ...rest: any[]) => {
      if (key.includes("/restore-points/")) throw new Error("r2 down");
      return (put as any)(key, ...rest);
    };
    const before = (await readManifest(fx.env, fx.backupId))!.manifest;
    const response = await edit(fx, "e1", "one");
    expect(response.status).toBe(200);
    expect(((await response.json()) as any).manifest).toMatchObject({
      revision: (before.revision ?? 0) + 1,
    });
    expect(keysUnder(fx, "restore-points/")).toEqual([]);

    fx.env.BUCKET.put = put;
    await edit(fx, "e2", "two");
    expect(await readPoint(fx, "2026-11-14")).toMatchObject({
      revision: (before.revision ?? 0) + 2,
    });
  });
});

describe("retention", () => {
  it("keeps 30 dates, and removes objects only an expired point held", async () => {
    const fx = await sharedFixture("2026-10-01");
    const shardOfE1 = cloudBackupShardOf("e1");
    at("2026-10-15T08:00:00Z");
    await edit(fx, "e1", "thirty");
    const old = await readPoint(fx, "2026-10-15");
    at("2026-10-16T08:00:00Z");
    await edit(fx, "e1", "twentynine");
    const kept = await readPoint(fx, "2026-10-16");
    expect(old.objects.shards[shardOfE1]).not.toBe(
      kept.objects.shards[shardOfE1],
    );

    // 2026-11-14 minus 30 days is 2026-10-15; minus 29 days is 2026-10-16.
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "today");
    expect(await readPoint(fx, "2026-10-15")).toBeNull();
    expect(await readPoint(fx, "2026-10-16")).not.toBeNull();
    expect(
      await fx.env.BUCKET.head(
        absoluteKey(fx.backupId, old.objects.shards[shardOfE1]),
      ),
    ).toBeNull();

    // The next commit makes the 29-day point's shard unreachable from the
    // live backup; only the point keeps it.
    await edit(fx, "e1", "again");
    expect(
      await fx.env.BUCKET.head(
        absoluteKey(fx.backupId, kept.objects.shards[shardOfE1]),
      ),
    ).not.toBeNull();
  });
});

describe("immutability", () => {
  it("leaves a point's objects and assets unchanged through later commits", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one", ["pic"]);
    const point = await readPoint(fx, "2026-11-14");
    const content = await contentOf(fx, point.objects);
    const raw = await fx.env.BUCKET.get(pointKey(fx, "2026-11-14"));
    const rawText = await raw!.text();

    at("2026-11-15T08:00:00Z");
    await delta(fx, {
      upserts: IDS.map((id) => ({ id, title: `changed ${id}` })),
      deletes: [],
      assetIds: ["pic"],
    });
    await delta(fx, { deletes: ["e1", "e2", "e3"], assetIds: ["pic"] });
    expect((await upload(fx, "pic", [9, 9, 9, 9])).status).toBe(200);
    at("2026-11-16T08:00:00Z");
    expect((await snapshot(fx, { e1: "s", e4: "s" }, ["pic"])).status).toBe(
      200,
    );
    at("2026-11-17T08:00:00Z");
    expect((await upload(fx, "pic", [7])).status).toBe(200);
    expect((await edit(fx, "e4", "dropped", [])).status).toBe(200);
    expect(await fx.env.BUCKET.get(getAssetKey(fx.backupId, "pic"))).toBeNull();
    await edit(fx, "e5", "more", []);

    expect(await contentOf(fx, point.objects)).toEqual(content);
    expect(
      await (await fx.env.BUCKET.get(pointKey(fx, "2026-11-14")))!.text(),
    ).toBe(rawText);
    expect(await assetBytes(fx, point, "pic")).toEqual([1, 2, 3]);
  });

  it("still preserves a pointed-at asset after sharing is turned off", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one", ["pic"]);
    const point = await readPoint(fx, "2026-11-14");
    await handleCloudBackupSharingOff(
      ownerRequest(fx.ownerCode, { method: "DELETE" }),
      fx.env,
      fx.backupId,
    );
    expect((await upload(fx, "pic", [5, 5])).status).toBe(200);
    expect(await assetBytes(fx, point, "pic")).toEqual([1, 2, 3]);
  });

  it("serializes sharing-off and asset writes until a new point is published", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    let entered!: () => void;
    let resume!: () => void;
    const reachedPoint = new Promise<void>((resolve) => (entered = resolve));
    const paused = new Promise<void>((resolve) => (resume = resolve));
    const bucket = fx.env.BUCKET;
    const head = bucket.head.bind(bucket);
    let delayed = false;
    bucket.head = async (key: string) => {
      if (!delayed && key === pointKey(fx, "2026-11-14")) {
        delayed = true;
        entered();
        await paused;
      }
      return head(key);
    };

    const commit = edit(fx, "e1", "pointed", ["pic"]);
    await reachedPoint;
    const sharingOff = await handleCloudBackupSharingOff(
      ownerRequest(fx.ownerCode, { method: "DELETE" }),
      fx.env,
      fx.backupId,
    );
    const uploadWhilePointing = await upload(fx, "pic", [5, 5]);
    expect(sharingOff.status).toBe(503);
    expect(uploadWhilePointing.status).toBe(503);
    expect(
      Array.from(
        (await bucket.get(getAssetKey(fx.backupId, "pic")))!.body as Uint8Array,
      ),
    ).toEqual([1, 2, 3]);

    resume();
    expect((await commit).status).toBe(200);
    bucket.head = head;
    const point = await readPoint(fx, "2026-11-14");
    await handleCloudBackupSharingOff(
      ownerRequest(fx.ownerCode, { method: "DELETE" }),
      fx.env,
      fx.backupId,
    );
    expect((await upload(fx, "pic", [5, 5])).status).toBe(200);
    expect(await assetBytes(fx, point, "pic")).toEqual([1, 2, 3]);
  });

  it("copies nothing it does not need to", async () => {
    const fx = await sharedFixture();
    const shardOfE1 = cloudBackupShardOf("e1");
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one", ["pic"]);
    at("2026-11-15T08:00:00Z");
    await edit(fx, "e1", "two", ["pic"]);
    const first = await readPoint(fx, "2026-11-14");
    const second = await readPoint(fx, "2026-11-15");
    for (const [shard, key] of Object.entries(first.objects.shards)) {
      if (shard === shardOfE1)
        expect(second.objects.shards[shard]).not.toBe(key);
      else expect(second.objects.shards[shard]).toBe(key);
    }
    expect(keysUnder(fx, "restore-points/assets/")).toEqual([]);
  });

  it("drops preserved asset copies once no point references them", async () => {
    const fx = await sharedFixture("2026-10-01");
    at("2026-10-10T08:00:00Z");
    await edit(fx, "e1", "one", ["pic"]);
    await upload(fx, "pic", [4, 4]);
    expect(keysUnder(fx, "restore-points/assets/pic/")).toHaveLength(1);
    // The point expires, so its copy goes with it.
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "two", ["pic"]);
    expect(keysUnder(fx, "restore-points/assets/pic/")).toEqual([]);
  });

  it("keeps at most one unreferenced copy per asset id across re-uploads", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one", ["pic"]);
    const point = await readPoint(fx, "2026-11-14");
    for (let i = 0; i < 6; i++) {
      expect((await upload(fx, "pic", [10 + i, i])).status).toBe(200);
    }
    const copies = keysUnder(fx, "restore-points/assets/pic/");
    const unreferenced = copies.filter(
      (key) => key !== preservedKey(fx, "pic", point.assets.pic),
    );
    expect(copies).toContain(preservedKey(fx, "pic", point.assets.pic));
    expect(unreferenced).toHaveLength(1);
    expect(await assetBytes(fx, point, "pic")).toEqual([1, 2, 3]);
  });

  it("does not grow unreferenced copies with rounds of new ids and prunes", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one", ["pic"]);
    const point = await readPoint(fx, "2026-11-14");
    const unreferencedBytes = () => {
      const referenced = preservedKey(fx, "pic", point.assets.pic);
      return keysUnder(fx, "restore-points/assets/")
        .filter((key) => key !== referenced)
        .reduce(
          (sum, key) =>
            sum + (fx.env.BUCKET.store.get(key)!.body as Uint8Array).length,
          0,
        );
    };
    const sizes: number[] = [];
    for (let round = 0; round < 6; round++) {
      for (const n of [0, 1, 2]) {
        const id = `r${round}n${n}`;
        await upload(fx, id, [1, 2, 3, 4, 5, 6, 7, 8]);
        // Overwriting under a new id each round must not pile up copies.
        await upload(fx, id, [9]);
      }
      expect((await edit(fx, "e2", `r${round}`, [])).status).toBe(200);
      sizes.push(unreferencedBytes());
    }
    expect(sizes.every((size) => size === 0)).toBe(true);
    expect(keysUnder(fx, "restore-points/assets/")).toEqual([
      preservedKey(fx, "pic", point.assets.pic),
    ]);
    expect(await assetBytes(fx, point, "pic")).toEqual([1, 2, 3]);
  });

  it("keeps total unreferenced copies to one version across many ids", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one", ["pic"]);
    const point = await readPoint(fx, "2026-11-14");
    for (let i = 0; i < 6; i++) {
      await upload(fx, `id${i}`, [1, 2, 3, 4, 5]);
      await upload(fx, `id${i}`, [9]);
    }
    expect(
      keysUnder(fx, "restore-points/assets/").filter(
        (key) => key !== preservedKey(fx, "pic", point.assets.pic),
      ),
    ).toHaveLength(1);
  });

  it("answers a retryable error when the asset changed since it was checked", async () => {
    const fx = await sharedFixture();
    const bucket = fx.env.BUCKET;
    const head = bucket.head.bind(bucket);
    bucket.head = async (key: string) => {
      const found = await head(key);
      if (key === getAssetKey(fx.backupId, "pic")) {
        await bucket.put(key, new Uint8Array([4, 2]));
      }
      return found;
    };
    expect((await upload(fx, "pic", [9])).status).toBe(503);
    bucket.head = head;
    expect(
      Array.from(
        (await bucket.get(getAssetKey(fx.backupId, "pic")))!.body as Uint8Array,
      ),
    ).toEqual([4, 2]);
  });

  it("refuses an overwrite, and skips a prune, when the copy fails", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one", ["pic"]);
    const put = fx.env.BUCKET.put.bind(fx.env.BUCKET);
    fx.env.BUCKET.put = (key: string, ...rest: any[]) => {
      if (key.includes("/restore-points/assets/")) throw new Error("r2 down");
      return (put as any)(key, ...rest);
    };
    const refused = await upload(fx, "pic", [8, 8]);
    expect(refused.status).toBe(503);
    expect(
      Array.from(
        (await fx.env.BUCKET.get(getAssetKey(fx.backupId, "pic")))!
          .body as Uint8Array,
      ),
    ).toEqual([1, 2, 3]);
    expect((await edit(fx, "e2", "two", [])).status).toBe(200);
    expect(
      await fx.env.BUCKET.get(getAssetKey(fx.backupId, "pic")),
    ).not.toBeNull();
  });
});

describe("cleanup safety", () => {
  it("deletes no commit objects when a point cannot be read", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one");
    await edit(fx, "e2", "two");
    await edit(fx, "e3", "three");
    const commits = () => keysUnder(fx, "/commits/").sort();
    const get = fx.env.BUCKET.get.bind(fx.env.BUCKET);
    fx.env.BUCKET.get = (key: string) => {
      if (key.includes("/restore-points/points/")) throw new Error("r2 down");
      return get(key);
    };
    const before = commits();
    expect((await edit(fx, "e4", "four")).status).toBe(200);
    expect(commits()).toEqual(expect.arrayContaining(before));

    fx.env.BUCKET.get = get;
    await edit(fx, "e5", "five");
    expect(commits().some((key) => !before.includes(key))).toBe(true);
    expect(before.some((key) => !commits().includes(key))).toBe(true);
  });
});

describe("GET /restore-points", () => {
  async function twoPoints() {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one");
    at("2026-11-15T08:00:00Z");
    await edit(fx, "e1", "two");
    return fx;
  }

  it("lists date, revision and entityCount, newest first", async () => {
    const fx = await twoPoints();
    const res = await route(fx, "GET", "/restore-points", fx.ownerCode);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toEqual({
      restorePoints: [
        { date: "2026-11-15", revision: 3, entityCount: 6 },
        { date: "2026-11-14", revision: 2, entityCount: 6 },
      ],
    });
  });

  it("returns an empty list when there are no points", async () => {
    const fx: Fixture = await createBackupFixture();
    const res = await route(fx, "GET", "/restore-points", fx.ownerCode);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ restorePoints: [] });
  });

  it("answers everyone but the owner like a wrong key", async () => {
    const fx = await twoPoints();
    const expected = await route(fx, "GET", "/restore-points", "f".repeat(64));
    const expectedBody = await expected.text();
    expect(expected.status).toBe(404);
    for (const res of [
      await route(
        fx,
        "GET",
        "/restore-points",
        fx.editorToken,
        "device-000001",
      ),
      await route(fx, "GET", "/restore-points", fx.editorToken),
      await route(fx, "GET", "/restore-points"),
      await handleCloudBackupRoutes(
        new Request(
          "https://example.test/api/cloud-backup/missing/restore-points",
          {
            headers: { Authorization: `Bearer ${fx.ownerCode}` },
          },
        ),
        fx.env as any,
        "/api/cloud-backup/missing/restore-points",
      ).then((r) => r!),
    ]) {
      expect(res.status).toBe(404);
      expect(await res.text()).toBe(expectedBody);
    }
  });

  it("answers a wrong method with 404", async () => {
    const fx = await twoPoints();
    const res = await route(fx, "POST", "/restore-points", fx.ownerCode);
    expect(res.status).toBe(404);
  });
});

describe("erasing a backup", () => {
  it("removes restore points and preserved assets with everything else", async () => {
    const fx = await sharedFixture();
    at("2026-11-14T08:00:00Z");
    await edit(fx, "e1", "one", ["pic"]);
    await upload(fx, "pic", [6]);
    expect(keysUnder(fx, "restore-points/").length).toBeGreaterThan(1);
    const res = await route(fx, "DELETE", "", fx.ownerCode);
    expect(res.status).toBe(200);
    expect(
      [...fx.env.BUCKET.store.keys()].filter((key) =>
        key.startsWith(getBackupPrefix(fx.backupId)),
      ),
    ).toEqual([]);
  });
});
