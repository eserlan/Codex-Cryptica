import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLOUD_BACKUP_LIMITS,
  cloudBackupShardOf,
  type CloudBackupTombstone,
} from "../../../../../packages/schema/src/publishing";
import type { Shard } from "../cloud-backup-entities";
import { evictOldestTrash } from "../cloud-backup-trash";
import type { BackupObjects, CloudBackupEnv } from "../cloud-backup-storage";
import { handleCloudBackupRoutes } from "../cloud-backup-routes";
import { readManifest } from "../cloud-backup-storage";
import { createBackupFixture, readCurrent } from "./cloud-backup-fixtures";

type Fixture = Awaited<ReturnType<typeof createBackupFixture>>;

const DAY = 24 * 60 * 60 * 1000;
const device = "device-trash-0001";

async function call(
  fx: Fixture,
  method: string,
  path: string,
  options: { key?: string; device?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = {};
  if (options.key) headers.Authorization = `Bearer ${options.key}`;
  if (options.device) headers["X-Codex-Device-Id"] = options.device;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const pathname = `/api/cloud-backup/${fx.backupId}${path.split("?")[0]}`;
  return (await handleCloudBackupRoutes(
    new Request(`https://example.test/api/cloud-backup/${fx.backupId}${path}`, {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    fx.env as never,
    pathname,
  ))!;
}

async function shared() {
  const fx = await createBackupFixture();
  await call(fx, "POST", "/commit", {
    key: fx.ownerCode,
    body: {
      vaultTitle: "V",
      bundle: {
        entities: [
          { id: "live", title: "Live" },
          { id: "x", title: "Doomed", connections: [{ target: "y" }] },
        ],
      },
    },
  });
  const on = await call(fx, "POST", "/sharing", { key: fx.ownerCode });
  const { editorToken } = (await on.json()) as { editorToken: string };
  return { ...fx, editorToken };
}

async function push(
  fx: Awaited<ReturnType<typeof shared>>,
  body: { upserts?: unknown[]; deletes?: string[]; editorName?: string },
  as: "owner" | "editor" = "owner",
  baseRevision?: number,
) {
  const { manifest } = (await readManifest(fx.env, fx.backupId))!;
  const response = await call(fx, "POST", "/delta", {
    key: as === "owner" ? fx.ownerCode : fx.editorToken,
    device,
    body: {
      vaultTitle: "V",
      baseLastPushedAt: manifest.lastPushedAt,
      baseRevision: baseRevision ?? manifest.revision,
      upserts: [],
      deletes: [],
      ...body,
    },
  });
  expect(response.status).toBe(200);
}

const list = async (fx: Awaited<ReturnType<typeof shared>>, key?: string) =>
  call(fx, "GET", "/trash", { key: key ?? fx.ownerCode, device });

afterEach(() => vi.useRealTimers());

describe("loaded-shard trash eviction work", () => {
  it("enumerates a loaded shard a constant number of times while evicting many entries", async () => {
    const ids: string[] = [];
    let shardName: string | undefined;
    for (let candidate = 0; ids.length < 128; candidate++) {
      const id = `loaded-${candidate}`;
      const name = cloudBackupShardOf(id);
      shardName ??= name;
      if (name === shardName) ids.push(id);
    }

    const shard: Shard = Object.create(null);
    const tombstones: Record<string, CloudBackupTombstone> =
      Object.create(null);
    for (const [rev, id] of ids.entries()) {
      shard[id] = { id, title: "Old item" };
      tombstones[id] = {
        id,
        rev,
        deletedBy: "owner",
        deletedAt: "2026-11-01T00:00:00.000Z",
        title: "Old item",
      };
    }

    let enumerations = 0;
    const observedShard = new Proxy(shard, {
      ownKeys(target) {
        enumerations++;
        return Reflect.ownKeys(target);
      },
    });
    const loaded = new Map([[shardName!, observedShard]]);
    const limits = CLOUD_BACKUP_LIMITS as { maxTrashBytes: number };
    const originalMaxBytes = limits.maxTrashBytes;
    limits.maxTrashBytes = 1;

    try {
      const result = await evictOldestTrash(
        {} as CloudBackupEnv,
        "backup",
        { trash: {} } as BackupObjects,
        loaded,
        tombstones,
      );

      expect(result?.evictedCount).toBe(ids.length);
      expect(Object.keys(shard)).toHaveLength(0);
      expect(enumerations).toBeLessThanOrEqual(3);
    } finally {
      limits.maxTrashBytes = originalMaxBytes;
    }
  });
});

describe("shared trash reads", () => {
  it("lists a deleted entity for the owner and for an editor", async () => {
    const fx = await shared();
    await push(fx, { deletes: ["x"] }, "editor");
    for (const key of [fx.ownerCode, fx.editorToken]) {
      const body = await (await list(fx, key)).json();
      expect(body.revision).toBe(2);
      expect(body.items).toEqual([
        expect.objectContaining({
          id: "x",
          title: "Doomed",
          deletedBy: "member",
          restorable: true,
        }),
      ]);
    }
  });

  it("answers 404 for a wrong key and a replaced editor token", async () => {
    const fx = await shared();
    expect((await list(fx, "f".repeat(64))).status).toBe(404);
    const old = fx.editorToken;
    await call(fx, "POST", "/sharing/replace-link", { key: fx.ownerCode });
    expect((await list(fx, old)).status).toBe(404);
    expect(
      (await call(fx, "GET", "/trash/x", { key: old, device })).status,
    ).toBe(404);
  });

  it("returns an item's kept content with its connections", async () => {
    const fx = await shared();
    await push(fx, { deletes: ["x"] });
    const response = await call(fx, "GET", "/trash/x", {
      key: fx.ownerCode,
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.entity).toEqual({
      id: "x",
      title: "Doomed",
      connections: [{ target: "y" }],
    });
    expect(body.tombstone).toMatchObject({ id: "x", deletedBy: "owner" });
  });

  it("answers 410 for an unknown id", async () => {
    const fx = await shared();
    const response = await call(fx, "GET", "/trash/nope", {
      key: fx.ownerCode,
    });
    expect(response.status).toBe(410);
    expect((await response.json()).error.code).toBe("not_restorable");
  });

  it("answers an empty list for a backup with no trash", async () => {
    const fx = await createBackupFixture();
    const body = await (await list(fx)).json();
    expect(body.items).toEqual([]);
  });

  it("drops an item once its id is upserted again", async () => {
    const fx = await shared();
    await push(fx, { deletes: ["x"] });
    await push(fx, { upserts: [{ id: "x", title: "Back" }] });
    expect((await (await list(fx)).json()).items).toEqual([]);
    expect(
      (await call(fx, "GET", "/trash/x", { key: fx.ownerCode })).status,
    ).toBe(410);
  });

  it("lets an edit pushed against the delete's revision beat the delete", async () => {
    const fx = await shared();
    await push(fx, { deletes: ["x"] });
    const { manifest } = (await readManifest(fx.env, fx.backupId))!;
    await push(
      fx,
      { upserts: [{ id: "x", title: "Edited" }] },
      "editor",
      manifest.revision,
    );
    const index = await readCurrent(fx.env, fx.backupId, "index");
    expect(index.entityHashes).toHaveProperty("x");
    expect(index.tombstones).toBeUndefined();
  });

  it("lists an evicted item as not restorable and answers 410 for it", async () => {
    const fx = await shared();
    const limits = CLOUD_BACKUP_LIMITS as { maxTrashBytes: number };
    const original = limits.maxTrashBytes;
    limits.maxTrashBytes = 100;
    try {
      await push(fx, {
        upserts: [{ id: "big", title: "Big", body: "x".repeat(400) }],
      });
      await push(fx, { deletes: ["big"] });
      await push(fx, { deletes: ["x"] });
      const { items } = await (await list(fx)).json();
      const byId = Object.fromEntries(items.map((i: any) => [i.id, i]));
      expect(byId.big.restorable).toBe(false);
      expect(
        (await call(fx, "GET", "/trash/big", { key: fx.ownerCode })).status,
      ).toBe(410);
    } finally {
      limits.maxTrashBytes = original;
    }
  });

  it("sorts the newest delete first", async () => {
    const fx = await shared();
    await push(fx, { deletes: ["x"] });
    await push(fx, { deletes: ["live"] });
    const { items } = await (await list(fx)).json();
    expect(items.map((i: any) => i.id)).toEqual(["live", "x"]);
  });
});

describe("shared trash purge", () => {
  const retention = CLOUD_BACKUP_LIMITS.trashRetentionDays * DAY;

  async function deletedAt(
    fx: Awaited<ReturnType<typeof shared>>,
    id: string,
    at: number,
  ) {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(at);
    await push(fx, { deletes: [id] });
  }

  it("keeps 30 days minus 1 s, removes 30 days plus 1 s, in list and storage", async () => {
    const fx = await shared();
    const t0 = Date.UTC(2026, 0, 1);
    await deletedAt(fx, "x", t0);
    await deletedAt(fx, "live", t0 + 2000);
    vi.setSystemTime(t0 + retention + 1000);
    // "x" is now 30 days + 1 s old, "live" is 30 days - 1 s old.
    expect((await (await list(fx)).json()).items.map((i: any) => i.id)).toEqual(
      ["live"],
    );
    await push(fx, { upserts: [{ id: "n", title: "N" }] });
    const index = await readCurrent(fx.env, fx.backupId, "index");
    expect(Object.keys(index.tombstones)).toEqual(["live"]);
    expect(index.entityHashes).toHaveProperty("n");
    const stored = (await readManifest(fx.env, fx.backupId))!;
    expect(JSON.stringify(stored.objects)).toContain("trash");
    expect(
      (await call(fx, "GET", "/trash/x", { key: fx.ownerCode })).status,
    ).toBe(410);
    expect(
      (await call(fx, "GET", "/trash/live", { key: fx.ownerCode })).status,
    ).toBe(200);
  });

  it("keeps a tombstone exactly 30 days old", async () => {
    const fx = await shared();
    const t0 = Date.UTC(2026, 0, 1);
    await deletedAt(fx, "x", t0);
    vi.setSystemTime(t0 + retention);
    await push(fx, { upserts: [{ id: "n" }] });
    expect(
      Object.keys((await readCurrent(fx.env, fx.backupId, "index")).tombstones),
    ).toEqual(["x"]);
  });

  it("drops expired tombstones from the owner's full snapshot", async () => {
    const fx = await shared();
    const t0 = Date.UTC(2026, 0, 1);
    await deletedAt(fx, "x", t0);
    await deletedAt(fx, "live", t0 + 2000);
    vi.setSystemTime(t0 + retention + 1000);
    const commit = await call(fx, "POST", "/commit", {
      key: fx.ownerCode,
      body: { vaultTitle: "V", bundle: { entities: [{ id: "n" }] } },
    });
    expect(commit.status).toBe(200);
    const index = await readCurrent(fx.env, fx.backupId, "index");
    expect(Object.keys(index.tombstones)).toEqual(["live"]);
  });

  it("sends a device behind a purged delete to resync", async () => {
    const fx = await shared();
    const t0 = Date.UTC(2026, 0, 1);
    await deletedAt(fx, "x", t0);
    const purgedRev = 2;
    vi.setSystemTime(t0 + retention + 1000);
    await push(fx, { upserts: [{ id: "n" }] });
    const feed = (since: number) =>
      call(fx, "GET", `/changes?since=${since}`, { key: fx.ownerCode }).then(
        (r) => r.json(),
      );
    expect((await feed(purgedRev - 1)).status).toBe("resync");
    expect((await feed(purgedRev)).status).toBe("changes");
  });
});

describe("who deleted it", () => {
  const deletedBy = async (
    name: string | undefined,
    as: "owner" | "editor",
  ) => {
    const fx = await shared();
    await push(fx, { deletes: ["x"], editorName: name }, as);
    return (await readCurrent(fx.env, fx.backupId, "index")).tombstones.x
      .deletedBy;
  };

  it("stamps an editor's name", async () => {
    expect(await deletedBy("  Mara\u0007 ", "editor")).toBe("Mara");
  });
  it("falls back to member for a missing or reserved name", async () => {
    expect(await deletedBy(undefined, "editor")).toBe("member");
    expect(await deletedBy("Owner", "editor")).toBe("member");
    expect(await deletedBy("MEMBER", "editor")).toBe("member");
    expect(await deletedBy("\u0001 ", "editor")).toBe("member");
  });
  it("ignores a name sent with the owner key", async () => {
    expect(await deletedBy("Mara", "owner")).toBe("owner");
  });
});

describe("trash storage usage reporting", () => {
  it("reports usedBytes and maxBytes for empty, populated, and evicted trash", async () => {
    const fx = await shared();
    const emptyRes = await call(fx, "GET", "/trash", { key: fx.ownerCode });
    expect(emptyRes.status).toBe(200);
    expect(await emptyRes.json()).toMatchObject({
      usedBytes: 0,
      maxBytes: CLOUD_BACKUP_LIMITS.maxTrashBytes,
      items: [],
    });

    await push(fx, { deletes: ["x"] });
    const stored = (await readManifest(fx.env, fx.backupId))!;
    let expectedBytes = 0;
    for (const ref of Object.values(stored.objects!.trash ?? {})) {
      expectedBytes +=
        (await fx.env.BUCKET.head(`cloud-backup/${fx.backupId}/${ref}`))
          ?.size ?? 0;
    }
    expect(expectedBytes).toBeGreaterThan(0);

    const populatedRes = await call(fx, "GET", "/trash", {
      key: fx.ownerCode,
    });
    expect(await populatedRes.json()).toMatchObject({
      usedBytes: expectedBytes,
      maxBytes: CLOUD_BACKUP_LIMITS.maxTrashBytes,
    });

    const limits = CLOUD_BACKUP_LIMITS as { maxTrashBytes: number };
    const original = limits.maxTrashBytes;
    limits.maxTrashBytes = 400;
    try {
      await push(fx, {
        upserts: [
          { id: "big-1", title: "Big 1", body: "a".repeat(300) },
          { id: "big-2", title: "Big 2", body: "b".repeat(300) },
        ],
      });
      await push(fx, { deletes: ["big-1"] });
      await push(fx, { deletes: ["big-2"] });

      const afterRes = await call(fx, "GET", "/trash", { key: fx.ownerCode });
      const afterBody = (await afterRes.json()) as {
        usedBytes: number;
        maxBytes: number;
      };
      expect(afterBody.maxBytes).toBe(400);
      expect(afterBody.usedBytes).toBeLessThanOrEqual(400);

      const afterStored = (await readManifest(fx.env, fx.backupId))!;
      let actualAfterBytes = 0;
      for (const ref of Object.values(afterStored.objects!.trash ?? {})) {
        actualAfterBytes +=
          (await fx.env.BUCKET.head(`cloud-backup/${fx.backupId}/${ref}`))
            ?.size ?? 0;
      }
      expect(afterBody.usedBytes).toBe(actualAfterBytes);
    } finally {
      limits.maxTrashBytes = original;
    }
  });
});
