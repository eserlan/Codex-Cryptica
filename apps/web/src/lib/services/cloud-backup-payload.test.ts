import { describe, expect, it, vi } from "vitest";
import {
  buildCloudBackupPayload,
  hydrateEntityContent,
  buildCloudBackupDelta,
  DELTA_MAX_ENTITIES,
  collectAssetPaths,
  isLocalAssetPath,
  assetIdForPath,
} from "./cloud-backup-payload";

const entity = (id: string, image?: string) =>
  ({ id, title: id, image }) as never;

/** A fetch that returns a small blob for any URL. */
const okFetch = (async () => ({
  ok: true,
  blob: async () =>
    new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
})) as unknown as typeof fetch;

describe("isLocalAssetPath", () => {
  it("treats vault-relative paths as local", () => {
    expect(isLocalAssetPath("assets/map.png")).toBe(true);
    expect(isLocalAssetPath("./assets/map.png")).toBe(true);
  });

  it("treats remote and inline references as external", () => {
    // These are references, not vault-owned files.
    for (const path of [
      "https://example.test/a.png",
      "http://example.test/a.png",
      "data:image/png;base64,AAAA",
      "blob:https://app/abc",
    ]) {
      expect(isLocalAssetPath(path), path).toBe(false);
    }
  });

  it("treats an empty path as not an asset", () => {
    expect(isLocalAssetPath("")).toBe(false);
  });
});

describe("assetIdForPath", () => {
  it("produces a stable, filesystem-safe id", () => {
    expect(assetIdForPath("./assets/my map.png")).toBe("assets_my_map.png");
    expect(assetIdForPath("/assets/a.png")).toBe(
      assetIdForPath("assets/a.png"),
    );
  });

  it("never emits a path separator", () => {
    // The worker rejects asset ids containing "/".
    expect(assetIdForPath("a/b/c.png")).not.toContain("/");
  });
});

describe("collectAssetPaths", () => {
  it("de-duplicates paths shared by several entities", () => {
    const paths = collectAssetPaths([
      entity("a", "assets/shared.png"),
      entity("b", "assets/shared.png"),
      entity("c", "assets/other.png"),
    ]);
    expect(paths.sort()).toEqual(["assets/other.png", "assets/shared.png"]);
  });

  it("ignores entities with no image and external references", () => {
    expect(
      collectAssetPaths([
        entity("a"),
        entity("b", "https://example.test/x.png"),
      ]),
    ).toEqual([]);
  });

  it("collects an entity thumbnail as well as its image", () => {
    // A thumbnail is a separate vault file; missing it leaves broken previews
    // in the restored vault.
    const paths = collectAssetPaths([
      { id: "a", image: "assets/full.png", thumbnail: "assets/thumb.png" },
    ] as never);
    expect(paths.sort()).toEqual(["assets/full.png", "assets/thumb.png"]);
  });

  it("collects a map's fog-of-war mask", () => {
    // Restoring without the mask reveals every area the GM had hidden, so a
    // missing mask leaks more than it loses.
    const paths = collectAssetPaths(
      [],
      [
        {
          id: "m1",
          assetPath: "maps/fens.jpg",
          fogOfWar: { maskPath: "maps/fens_mask.png" },
        },
      ],
    );
    expect(paths.sort()).toEqual(["maps/fens.jpg", "maps/fens_mask.png"]);
  });

  it("handles a map with no fog of war", () => {
    expect(
      collectAssetPaths([], [{ id: "m1", assetPath: "maps/fens.jpg" }]),
    ).toEqual(["maps/fens.jpg"]);
  });

  it("collects a map's background image", () => {
    const paths = collectAssetPaths(
      [],
      [
        { id: "m1", assetPath: "maps/fens.jpg" },
        { id: "m2", assetPath: "https://example.test/remote.jpg" },
      ],
    );
    expect(paths).toEqual(["maps/fens.jpg"]);
  });
});

describe("buildCloudBackupPayload", () => {
  it("includes the entities and every readable asset", async () => {
    // The consent screen promises media, so entities alone is not enough.
    const result = await buildCloudBackupPayload(
      "The Saltmere Fens",
      [entity("e1", "assets/map.png")],
      { resolveImageUrl: async () => "blob:x", fetch: okFetch },
    );

    expect(result.vaultTitle).toBe("The Saltmere Fens");
    expect(result.bundle.entities).toHaveLength(1);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].assetId).toBe("assets_map.png");
    expect([...result.assets[0].bytes]).toEqual([1, 2, 3]);
    expect(result.assets[0].mimeType).toBe("image/png");
    expect(result.skippedAssets).toEqual([]);
  });

  it("records the manifest so restore knows where each file belongs", async () => {
    const result = await buildCloudBackupPayload(
      "V",
      [entity("e1", "assets/map.png")],
      { resolveImageUrl: async () => "blob:x", fetch: okFetch },
    );
    expect(result.bundle.assetManifest).toEqual([
      {
        assetId: "assets_map.png",
        path: "assets/map.png",
        mimeType: "image/png",
      },
    ]);
  });

  it("skips an unreadable image rather than failing the whole backup", async () => {
    // One broken file must not cost the user their backup — but it must be
    // reported, so the save is never described as complete when it is not.
    const result = await buildCloudBackupPayload(
      "V",
      [entity("e1", "assets/broken.png"), entity("e2", "assets/ok.png")],
      {
        resolveImageUrl: async (path) =>
          path.includes("broken") ? null : "blob:x",
        fetch: okFetch,
      },
    );

    expect(result.skippedAssets).toEqual(["assets/broken.png"]);
    expect(result.assets).toHaveLength(1);
    expect(result.bundle.entities).toHaveLength(2);
  });

  it("skips an asset whose fetch fails", async () => {
    const result = await buildCloudBackupPayload("V", [entity("e1", "a.png")], {
      resolveImageUrl: async () => "blob:x",
      fetch: (async () => ({
        ok: false,
        status: 404,
      })) as unknown as typeof fetch,
    });
    expect(result.skippedAssets).toEqual(["a.png"]);
  });

  it("produces an empty asset set for a vault with no media", async () => {
    const resolveImageUrl = vi.fn();
    const result = await buildCloudBackupPayload("V", [entity("e1")], {
      resolveImageUrl,
      fetch: okFetch,
    });
    expect(result.assets).toEqual([]);
    expect(resolveImageUrl).not.toHaveBeenCalled();
  });

  it("keeps a large asset as raw bytes rather than expanding it", async () => {
    // Base64 would add a third to every byte and force the whole vault through
    // one JSON body; the bytes are passed straight through for its own upload.
    const big = new Uint8Array(300_000).fill(65);
    const result = await buildCloudBackupPayload(
      "V",
      [entity("e1", "big.png")],
      {
        resolveImageUrl: async () => "blob:x",
        fetch: (async () => ({
          ok: true,
          blob: async () => new Blob([big], { type: "image/png" }),
        })) as unknown as typeof fetch,
      },
    );
    expect(result.assets[0].bytes.byteLength).toBe(300_000);
    expect(result.skippedAssets).toEqual([]);
  });
});

describe("buildCloudBackupPayload with maps and canvases", () => {
  it("carries maps and canvases in the bundle", async () => {
    const result = await buildCloudBackupPayload(
      "V",
      [entity("e1")],
      { resolveImageUrl: async () => "blob:x", fetch: okFetch },
      { maps: [{ id: "m1" }], canvases: [{ id: "c1" }] },
    );

    expect(result.bundle.maps).toEqual([{ id: "m1" }]);
    expect(result.bundle.canvases).toEqual([{ id: "c1" }]);
  });

  it("uploads a map's background image alongside entity media", async () => {
    const result = await buildCloudBackupPayload(
      "V",
      [entity("e1", "assets/portrait.png")],
      { resolveImageUrl: async () => "blob:x", fetch: okFetch },
      { maps: [{ id: "m1", assetPath: "maps/fens.jpg" }] },
    );

    expect(result.bundle.assetManifest.map((a) => a.path).sort()).toEqual([
      "assets/portrait.png",
      "maps/fens.jpg",
    ]);
  });

  it("defaults to empty maps and canvases when none are passed", async () => {
    const result = await buildCloudBackupPayload("V", [entity("e1")], {
      resolveImageUrl: async () => "blob:x",
      fetch: okFetch,
    });

    expect(result.bundle.maps).toEqual([]);
    expect(result.bundle.canvases).toEqual([]);
  });
});

describe("hydrateEntityContent", () => {
  /**
   * Models the real store: entities start with the 280-char warm-start preview
   * in `content`; a read returns the full record without touching the store.
   */
  const makeVault = (
    bodies: Record<string, string>,
    unreadable: string[] = [],
    loadedIds: string[] = [],
  ) => {
    const loaded = new Set<string>(loadedIds);
    const records: Record<string, any> = {};
    for (const id of Object.keys(bodies)) {
      records[id] = { id, title: id, content: `${id} preview…` };
    }
    const snapshot = { ...records };
    const reads: string[] = [];
    return {
      records,
      snapshot,
      reads,
      hydrator: {
        isContentLoaded: (id: string) => loaded.has(id),
        readFullEntity: async (id: string) => {
          reads.push(id);
          if (unreadable.includes(id)) throw new Error("unreadable");
          return { ...records[id], content: bodies[id] };
        },
      },
    };
  };

  it("replaces the warm-start preview with the full markdown", async () => {
    const vault = makeVault({
      a: "# Aldric\n\nFull lore body.\n",
      b: "# Brine\n\nMore lore.\n",
    });

    const result = await hydrateEntityContent(
      Object.values(vault.records) as never,
      vault.hydrator,
    );

    expect(result.entities.map((e: any) => e.content)).toEqual([
      "# Aldric\n\nFull lore body.\n",
      "# Brine\n\nMore lore.\n",
    ]);
    expect(result.skippedEntities).toEqual([]);
  });

  it("never writes hydrated bodies into the live records", async () => {
    const vault = makeVault({ a: "full a", b: "full b" });

    await hydrateEntityContent(
      Object.values(vault.records) as never,
      vault.hydrator,
    );

    expect(vault.records).toEqual(vault.snapshot);
    expect(vault.records.a.content).toBe("a preview…");
  });

  it("leaves already-loaded entities untouched", async () => {
    const vault = makeVault({ a: "full" }, [], ["a"]);

    await hydrateEntityContent(
      Object.values(vault.records) as never,
      vault.hydrator,
    );

    expect(vault.reads).toEqual([]);
  });

  it("reports an unreadable entity instead of dropping the backup", async () => {
    const vault = makeVault({ a: "full a", b: "full b" }, ["b"]);

    const result = await hydrateEntityContent(
      Object.values(vault.records) as never,
      vault.hydrator,
    );

    expect(result.skippedEntities).toEqual(["b"]);
    expect((result.entities[0] as any).content).toBe("full a");
    // The unreadable one keeps what it had rather than vanishing.
    expect(result.entities).toHaveLength(2);
  });

  it("stops reading once the build is aborted", async () => {
    const bodies: Record<string, string> = {};
    for (let i = 0; i < 20; i++) bodies[`e${i}`] = `body ${i}`;
    const vault = makeVault(bodies);
    const controller = new AbortController();
    const readFullEntity = vault.hydrator.readFullEntity;
    vault.hydrator.readFullEntity = async (id: string) => {
      if (vault.reads.length === 3) controller.abort();
      return readFullEntity(id);
    };

    await hydrateEntityContent(
      Object.values(vault.records) as never,
      vault.hydrator,
      1,
      controller.signal,
    );

    expect(vault.reads.length).toBeLessThan(20);
  });

  it("preserves order under bounded concurrency", async () => {
    const bodies: Record<string, string> = {};
    for (let i = 0; i < 25; i++) bodies[`e${i}`] = `body ${i}`;
    const vault = makeVault(bodies);

    const result = await hydrateEntityContent(
      Object.values(vault.records) as never,
      vault.hydrator,
      4,
    );

    expect(result.entities.map((e: any) => e.id)).toEqual(Object.keys(bodies));
    expect(result.entities.map((e: any) => e.content)).toEqual(
      Object.values(bodies),
    );
  });
});

describe("buildCloudBackupPayload content fidelity", () => {
  it("backs up the full markdown, never the preview", async () => {
    // The regression: the snapshot took whatever was in memory, which on a
    // warm start is a whitespace-collapsed 280-char preview.
    const records: Record<string, any> = {
      npc: { id: "npc", title: "npc", content: "npc preview…" },
    };
    const loaded = new Set<string>();

    const payload = await buildCloudBackupPayload(
      "Vault",
      Object.values(records) as never,
      {
        resolveImageUrl: async () => null,
        fetch: okFetch,
        hydrateEntities: {
          isContentLoaded: (id) => loaded.has(id),
          readFullEntity: async (id) => ({
            ...records[id],
            content: "# Aldric\n\nThe whole body.\n",
          }),
        },
      },
    );

    expect(payload.bundle.entities[0].content).toBe(
      "# Aldric\n\nThe whole body.\n",
    );
    expect(payload.skippedEntities).toEqual([]);
  });

  it("still builds a payload when no hydrator is injected", async () => {
    const payload = await buildCloudBackupPayload("Vault", [entity("a")], {
      resolveImageUrl: async () => null,
      fetch: okFetch,
    });

    expect(payload.bundle.entities).toHaveLength(1);
    expect(payload.skippedEntities).toEqual([]);
  });
});

describe("buildCloudBackupDelta (#3354)", () => {
  const vaultOf = (count: number, extra: Record<string, any> = {}) => {
    const records: Record<string, any> = {};
    for (let i = 0; i < count; i++) {
      records[`e${i}`] = { id: `e${i}`, title: `E${i}`, content: "preview" };
    }
    Object.assign(records, extra);
    const reads: string[] = [];
    return {
      records,
      reads,
      deps: {
        getEntity: (id: string) => records[id],
        hydrateEntities: {
          isContentLoaded: (id: string) => id === "loaded",
          readFullEntity: async (id: string) => {
            reads.push(id);
            if (id === "unreadable") throw new Error("gone");
            return { ...records[id], content: `full ${id}` };
          },
        },
        uploadedAssetIds: new Set<string>(["known.png"]),
      },
    };
  };
  const change = (id: string, deleted = false) => ({
    kind: "entity" as const,
    id,
    deleted,
  });

  it("reads only the changed entities of a large vault", async () => {
    const vault = vaultOf(1600);

    const delta = await buildCloudBackupDelta(
      "Vault",
      [change("e1"), change("e2"), change("e3")],
      vault.deps as never,
    );

    expect(vault.reads).toEqual(["e1", "e2", "e3"]);
    expect(delta?.upserts.map((e: any) => e.content)).toEqual([
      "full e1",
      "full e2",
      "full e3",
    ]);
    expect(delta?.deletes).toEqual([]);
    expect(delta).not.toHaveProperty("maps");
    expect(delta).not.toHaveProperty("canvases");
  });

  it("uses an already-loaded body without reading it again", async () => {
    const vault = vaultOf(0, {
      loaded: { id: "loaded", title: "L", content: "in memory" },
    });

    const delta = await buildCloudBackupDelta(
      "Vault",
      [change("loaded")],
      vault.deps as never,
    );

    expect(vault.reads).toEqual([]);
    expect((delta?.upserts[0] as any).content).toBe("in memory");
  });

  it("sends tombstones and vanished entities as deletes", async () => {
    const vault = vaultOf(2);

    const delta = await buildCloudBackupDelta(
      "Vault",
      [change("e0", true), change("never-existed")],
      vault.deps as never,
    );

    expect(delta?.deletes).toEqual(["e0", "never-existed"]);
    expect(delta?.upserts).toEqual([]);
    expect(vault.reads).toEqual([]);
  });

  it("includes maps and canvases whole only when they changed", async () => {
    const vault = vaultOf(0);

    const delta = await buildCloudBackupDelta(
      "Vault",
      [
        { kind: "maps", id: "*", deleted: false },
        { kind: "canvas", id: "c1", deleted: false },
      ],
      vault.deps as never,
      { maps: [{ id: "m1" }], canvases: [{ id: "c1" }, { id: "c2" }] },
    );

    expect(delta?.maps).toEqual([{ id: "m1" }]);
    expect(delta?.canvases).toEqual([{ id: "c1" }, { id: "c2" }]);
  });

  it("asks for a full upload when it cannot send a faithful delta", async () => {
    const vault = vaultOf(DELTA_MAX_ENTITIES + 1, {
      pictured: { id: "pictured", title: "P", image: "new.png" },
      known: { id: "known", title: "K", image: "known.png" },
      unreadable: { id: "unreadable", title: "U" },
    });
    const deps = vault.deps as never;
    const many = Object.keys(vault.records)
      .slice(0, DELTA_MAX_ENTITIES + 1)
      .map((id) => change(id));

    expect(
      await buildCloudBackupDelta(
        "Vault",
        [{ kind: "full", id: "*", deleted: false }],
        deps,
      ),
    ).toBeNull();
    expect(await buildCloudBackupDelta("Vault", many, deps)).toBeNull();
    expect(
      await buildCloudBackupDelta("Vault", [change("pictured")], deps),
    ).toBeNull();
    expect(
      await buildCloudBackupDelta("Vault", [change("unreadable")], deps),
    ).toBeNull();
    // An image the backup already holds does not force a full upload.
    expect(
      await buildCloudBackupDelta("Vault", [change("known")], deps),
    ).not.toBeNull();
  });
});
