import { describe, expect, it } from "vitest";
import { CLOUD_BACKUP_LIMITS } from "../../../../../packages/schema/src/publishing";
import { handleCloudBackupRoutes } from "../cloud-backup-routes";
import {
  getAssetKey,
  readManifest,
  writeManifest,
} from "../cloud-backup-storage";
import { createBackupFixture, readCurrent } from "./cloud-backup-fixtures";

type Fixture = Awaited<ReturnType<typeof createBackupFixture>>;

const device = "device-whole-0001";
const M1 = "11111111-1111-4111-8111-111111111111";
const M2 = "22222222-2222-4222-8222-222222222222";
const C1 = "33333333-3333-4333-8333-333333333333";

async function call(
  fx: Fixture,
  method: string,
  path: string,
  options: { key?: string; body?: unknown } = {},
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
        options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    fx.env as never,
    pathname,
  ))!;
}

async function committed(shareIt = true) {
  const fx = await createBackupFixture();
  await call(fx, "POST", "/commit", {
    key: fx.ownerCode,
    body: {
      vaultTitle: "V",
      bundle: {
        entities: [{ id: "a", title: "A" }],
        maps: [
          { id: M1, name: "Atlas" },
          { id: M2, name: "Other" },
        ],
        canvases: [{ id: C1, name: "Plot", slug: "plot" }],
        sessionJournals: [{ id: "j" }],
        adventures: [{ id: "adv" }],
        assetManifest: [],
      },
      assetIds: [],
    },
  });
  if (!shareIt) return { ...fx, editorToken: "" };
  const on = await call(fx, "POST", "/sharing", { key: fx.ownerCode });
  const { editorToken } = (await on.json()) as { editorToken: string };
  return { ...fx, editorToken };
}

async function push(
  fx: Awaited<ReturnType<typeof committed>>,
  body: Record<string, unknown>,
  as: "owner" | "editor" = "owner",
) {
  const { manifest } = (await readManifest(fx.env, fx.backupId))!;
  return call(fx, "POST", "/delta", {
    key: as === "owner" ? fx.ownerCode : fx.editorToken,
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

const feed = async (fx: Fixture, since: number) =>
  (
    await call(fx, "GET", `/changes?since=${since}`, { key: fx.ownerCode })
  ).json();

describe("maps and canvases as whole items", () => {
  it("keeps snapshot map assets in trash after a later delete", async () => {
    const fx = await createBackupFixture();
    const assets = [
      {
        path: "maps/atlas.webp",
        assetId: "atlas-bg--1",
        mimeType: "image/webp",
      },
      {
        path: "maps/atlas_mask.png",
        assetId: "atlas-mask--2",
        mimeType: "image/png",
      },
    ];
    for (const asset of assets) {
      await fx.env.BUCKET.put(getAssetKey(fx.backupId, asset.assetId), "image");
    }
    const snapshot = await call(fx, "POST", "/commit", {
      key: fx.ownerCode,
      body: {
        vaultTitle: "V",
        bundle: {
          entities: [{ id: "a", title: "A" }],
          maps: [
            {
              id: M1,
              name: "Atlas",
              assetPath: assets[0].path,
              fogOfWar: { maskPath: assets[1].path },
            },
          ],
          canvases: [],
          assetManifest: assets,
        },
        assetIds: assets.map((asset) => asset.assetId),
      },
    });
    expect(snapshot.status).toBe(200);
    const index = await readCurrent(fx.env, fx.backupId, "index");
    expect(index.mapMeta[M1].assets).toEqual(assets);

    const { editorToken } = (await (
      await call(fx, "POST", "/sharing", { key: fx.ownerCode })
    ).json()) as { editorToken: string };
    const deletion = await push(
      { ...fx, editorToken },
      { mapDeletes: [M1], assetIds: [] },
    );
    expect(deletion.status).toBe(200);

    const trashed = (await (
      await call(fx, "GET", `/trash/${M1}`, { key: fx.ownerCode })
    ).json()) as { assets: unknown[] };
    expect(trashed.assets).toEqual(assets);
    for (const asset of assets) {
      expect(
        await fx.env.BUCKET.head(getAssetKey(fx.backupId, asset.assetId)),
      ).not.toBeNull();
    }
  });

  it("stamps an upserted map and serves it only after its revision", async () => {
    const fx = await committed();
    const res = await push(fx, {
      mapUpserts: [{ item: { id: M1, name: "Atlas v2" } }],
    });
    expect(res.status).toBe(200);
    const body = await feed(fx, 1);
    expect(body.maps).toHaveLength(1);
    expect(body.maps[0].item.name).toBe("Atlas v2");
    expect(body.maps[0].meta.rev).toBe(2);
    expect((await feed(fx, 2)).maps).toEqual([]);
    const all = await feed(fx, 0);
    expect(all.maps.map((m: any) => m.meta.rev)).toEqual([2, 1]);
    const bundle = await readCurrent(fx.env, fx.backupId, "bundle");
    expect(bundle.maps.map((m: any) => m.name).sort()).toEqual([
      "Atlas v2",
      "Other",
    ]);
  });

  it("does not bump the revision of an unchanged upsert", async () => {
    const fx = await committed();
    await push(fx, { mapUpserts: [{ item: { id: M1, name: "Atlas" } }] });
    const index = await readCurrent(fx.env, fx.backupId, "index");
    expect(index.mapMeta[M1].rev).toBe(1);
  });

  it("tombstones a deleted canvas and keeps it restorable", async () => {
    const fx = await committed();
    expect((await push(fx, { canvasDeletes: [C1] })).status).toBe(200);
    const body = await feed(fx, 1);
    expect(body.tombstones).toEqual([
      expect.objectContaining({
        id: C1,
        kind: "canvas",
        title: "Plot",
        rev: 2,
      }),
    ]);
    const list = await (
      await call(fx, "GET", "/trash", { key: fx.editorToken })
    ).json();
    expect(list.items).toEqual([
      expect.objectContaining({ id: C1, kind: "canvas", restorable: true }),
    ]);
    const item = await (
      await call(fx, "GET", `/trash/${C1}`, { key: fx.ownerCode })
    ).json();
    expect(item.entity).toEqual({ id: C1, name: "Plot", slug: "plot" });

    await push(fx, { canvasUpserts: [{ item: { id: C1, name: "Plot" } }] });
    expect((await feed(fx, 2)).tombstones).toEqual([]);
  });

  it("stamps changed items and tombstones removed ones for a legacy list", async () => {
    const fx = await committed();
    await push(fx, {
      maps: [
        { id: M1, name: "Atlas" },
        { id: "44444444-4444-4444-8444-444444444444", name: "New" },
      ],
    });
    const body = await feed(fx, 1);
    expect(body.maps.map((m: any) => m.item.name)).toEqual(["New"]);
    expect(body.tombstones).toEqual([
      expect.objectContaining({ id: M2, kind: "map", title: "Other" }),
    ]);
  });

  it("rejects a delta that sends both forms for one kind", async () => {
    const fx = await committed();
    const res = await push(fx, { maps: [], mapDeletes: [M1] });
    expect(res.status).toBe(400);
  });

  it("answers 409 missing_asset and commits nothing for an unstored asset", async () => {
    const fx = await committed();
    const before = (await readManifest(fx.env, fx.backupId))!.manifest;
    const res = await push(fx, {
      mapUpserts: [
        {
          item: { id: M1, name: "Atlas" },
          assets: [
            { path: "maps/a.png", assetId: "a--0", mimeType: "image/png" },
          ],
        },
      ],
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as any).error.code).toBe("missing_asset");
    expect((await readManifest(fx.env, fx.backupId))!.manifest.revision).toBe(
      before.revision,
    );
  });

  it("records a map's assets and keeps live and trashed ones on prune", async () => {
    const fx = await committed();
    for (const id of ["bg--1", "mask--2", "stray--3"]) {
      await fx.env.BUCKET.put(getAssetKey(fx.backupId, id), "x");
    }
    const assets = [
      { path: "maps/a.png", assetId: "bg--1", mimeType: "image/png" },
      { path: "maps/a_mask.png", assetId: "mask--2", mimeType: "image/png" },
    ];
    await push(fx, {
      mapUpserts: [{ item: { id: M1, name: "Atlas" }, assets }],
      assetIds: ["bg--1", "mask--2"],
    });
    const bundle = await readCurrent(fx.env, fx.backupId, "bundle");
    expect(bundle.assetManifest).toEqual(assets);
    expect(
      await fx.env.BUCKET.head(getAssetKey(fx.backupId, "stray--3")),
    ).toBeNull();

    await push(fx, { mapDeletes: [M1], assetIds: [] });
    expect(
      await fx.env.BUCKET.head(getAssetKey(fx.backupId, "bg--1")),
    ).not.toBeNull();
    const trashed = await (
      await call(fx, "GET", `/trash/${M1}`, { key: fx.ownerCode })
    ).json();
    expect(trashed.assets).toEqual(assets);
  });

  it("serves an editor a bundle without journals and adventures", async () => {
    const fx = await committed();
    const editor = (await (
      await call(fx, "GET", "/bundle", { key: fx.editorToken })
    ).json()) as any;
    expect(editor.bundle.sessionJournals).toBeUndefined();
    expect(editor.bundle.adventures).toBeUndefined();
    const owner = (await (
      await call(fx, "GET", "/bundle", { key: fx.ownerCode })
    ).json()) as any;
    expect(owner.bundle.sessionJournals).toEqual([{ id: "j" }]);
    expect(owner.bundle.adventures).toEqual([{ id: "adv" }]);
  });

  it("serves maps of a backup without item revisions only for since=0", async () => {
    const fx = await committed();
    const stored = (await readManifest(fx.env, fx.backupId))!;
    const index = await readCurrent(fx.env, fx.backupId, "index");
    delete index.mapMeta;
    delete index.canvasMeta;
    const { writeJson, getStagedKey } = await import("../cloud-backup-storage");
    await writeJson(
      fx.env,
      getStagedKey(fx.backupId, "legacy", "index.json"),
      index,
    );
    await writeManifest(
      fx.env,
      fx.backupId,
      { ...stored.manifest, revision: 3 },
      stored.ownerCodeHash!,
      { ...stored.objects!, index: "commits/legacy/index.json" },
      stored.etag,
    );
    expect((await feed(fx, 0)).maps).toHaveLength(2);
    const later = await feed(fx, 1);
    expect(later.maps).toEqual([]);
    expect(later.canvases).toEqual([]);
  });

  it("leaves the bundle unchanged when the commit loses the race", async () => {
    const fx = await committed(false);
    const before = await readCurrent(fx.env, fx.backupId, "bundle");
    const put = fx.env.BUCKET.put.bind(fx.env.BUCKET);
    let fired = false;
    (fx.env.BUCKET as any).put = async (key: string, ...rest: any[]) => {
      if (!fired && key.endsWith("/manifest.json")) {
        fired = true;
        await push(fx, { canvasDeletes: [C1] });
      }
      return (put as any)(key, ...rest);
    };
    const { manifest } = (await readManifest(fx.env, fx.backupId))!;
    const res = await call(fx, "POST", "/delta", {
      key: fx.ownerCode,
      body: {
        vaultTitle: "V",
        baseLastPushedAt: manifest.lastPushedAt,
        baseRevision: manifest.revision,
        upserts: [],
        deletes: [],
        mapUpserts: [{ item: { id: M1, name: "Loser" } }],
      },
    });
    expect(res.status).toBe(409);
    const after = await readCurrent(fx.env, fx.backupId, "bundle");
    expect(after.maps).toEqual(before.maps);
  });

  it("caps tombstone titles at maxTitleLength for deleted whole items while preserving full names in trash", async () => {
    const fx = await committed();
    const longMapName = "M".repeat(CLOUD_BACKUP_LIMITS.maxTitleLength + 40);
    const longCanvasName = "C".repeat(CLOUD_BACKUP_LIMITS.maxTitleLength + 40);

    expect(
      (
        await push(fx, {
          mapUpserts: [{ item: { id: M1, name: longMapName } }],
          canvasUpserts: [
            { item: { id: C1, name: longCanvasName, slug: "plot" } },
          ],
        })
      ).status,
    ).toBe(200);

    expect(
      (await push(fx, { mapDeletes: [M1], canvasDeletes: [C1] })).status,
    ).toBe(200);

    const expectedMapTitle = longMapName.slice(
      0,
      CLOUD_BACKUP_LIMITS.maxTitleLength,
    );
    const expectedCanvasTitle = longCanvasName.slice(
      0,
      CLOUD_BACKUP_LIMITS.maxTitleLength,
    );

    const index = await readCurrent(fx.env, fx.backupId, "index");
    expect(index.tombstones[M1].title).toBe(expectedMapTitle);
    expect(index.tombstones[M1].title).toHaveLength(
      CLOUD_BACKUP_LIMITS.maxTitleLength,
    );
    expect(index.tombstones[C1].title).toBe(expectedCanvasTitle);
    expect(index.tombstones[C1].title).toHaveLength(
      CLOUD_BACKUP_LIMITS.maxTitleLength,
    );

    const changes = await feed(fx, 2);
    expect(changes.tombstones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: M1,
          kind: "map",
          title: expectedMapTitle,
        }),
        expect.objectContaining({
          id: C1,
          kind: "canvas",
          title: expectedCanvasTitle,
        }),
      ]),
    );

    const trashList = await (
      await call(fx, "GET", "/trash", { key: fx.ownerCode })
    ).json();
    expect(trashList.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: M1, title: expectedMapTitle }),
        expect.objectContaining({ id: C1, title: expectedCanvasTitle }),
      ]),
    );

    const mapTrash = await (
      await call(fx, "GET", `/trash/${M1}`, { key: fx.ownerCode })
    ).json();
    expect(mapTrash.tombstone.title).toBe(expectedMapTitle);
    expect(mapTrash.entity).toEqual({ id: M1, name: longMapName });

    const canvasTrash = await (
      await call(fx, "GET", `/trash/${C1}`, { key: fx.ownerCode })
    ).json();
    expect(canvasTrash.tombstone.title).toBe(expectedCanvasTitle);
    expect(canvasTrash.entity).toEqual({
      id: C1,
      name: longCanvasName,
      slug: "plot",
    });
  });
});
