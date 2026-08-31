import { describe, expect, it, vi } from "vitest";
import {
  buildCloudBackupPayload,
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
