import { describe, expect, it, vi } from "vitest";
import {
  collectArtworkBackup,
  omitPrivateMapArtwork,
} from "./cloud-backup-artwork";

const snapshot = {
  kind: "snapshot",
  path: "images/artwork_keep.png",
  mime: "image/png",
  bytes: 8,
  width: 1,
  height: 1,
  sha256: "a".repeat(64),
};
const association = { version: 1, override: snapshot };
const adventure = {
  id: "a1",
  artwork: {
    version: 1,
    associations: [{ subject: { kind: "place", id: "p1" }, association }],
  },
};

describe("adventure backup projection", () => {
  it("does not read adventures or expose entity artwork without consent", async () => {
    const readAdventures = vi.fn();
    const original = {
      id: "e1",
      image: "images/ordinary.png",
      adventureArtwork: association,
    };
    const result = await collectArtworkBackup(
      false,
      [original],
      readAdventures,
    );
    expect(readAdventures).not.toHaveBeenCalled();
    expect(result.entities[0]).toEqual({
      id: "e1",
      image: "images/ordinary.png",
    });
    expect(result.adventures).toBeUndefined();
    expect(result.snapshotPaths).toEqual([]);
    expect(original.adventureArtwork).toBe(association);
  });
  it("removes private snapshot references from ordinary image fields without changing the source", async () => {
    const original = {
      id: "e1",
      image: snapshot.path,
      thumbnail: `./${snapshot.path}`,
    };
    const result = await collectArtworkBackup(
      false,
      [original],
      async () => [],
    );
    expect(result.entities[0]).toEqual({ id: "e1" });
    expect(original.image).toBe(snapshot.path);
    expect(original.thumbnail).toBe(`./${snapshot.path}`);
  });
  it("refuses private map references without silently losing the map or fog mask", () => {
    const original = {
      assetPath: snapshot.path,
      fogOfWar: { maskPath: snapshot.path, enabled: true },
      title: "Map",
    };
    expect(() => omitPrivateMapArtwork(original)).toThrow(
      "private adventure artwork",
    );
    expect(() =>
      omitPrivateMapArtwork({ fogOfWar: original.fogOfWar }),
    ).toThrow("private adventure artwork");
    expect(original.assetPath).toBe(snapshot.path);
    expect(original.fogOfWar.maskPath).toBe(snapshot.path);
    expect(omitPrivateMapArtwork({ assetPath: "images/ordinary.png" })).toEqual(
      { assetPath: "images/ordinary.png" },
    );
  });
  it("includes consented adventures and unique references from all owners", async () => {
    const result = await collectArtworkBackup(
      true,
      [{ id: "e1", adventureArtwork: association }],
      async () => [adventure],
    );
    expect(result.adventures).toEqual([adventure]);
    expect(result.snapshotPaths).toEqual([snapshot.path]);
    expect(result.entities[0].adventureArtwork).toEqual(association);
  });
  it("fails closed on unreadable or opaque references instead of silently dropping files", async () => {
    await expect(
      collectArtworkBackup(true, [], async () => [
        { id: "a1", artwork: { version: 2 } },
      ]),
    ).rejects.toThrow();
    await expect(
      collectArtworkBackup(
        true,
        [{ id: "e1", adventureArtwork: { version: 2 } }],
        async () => [],
      ),
    ).rejects.toThrow();
    await expect(
      collectArtworkBackup(true, [], async () => {
        throw new Error("unreadable");
      }),
    ).rejects.toThrow();
  });
  it("rejects conflicting snapshot claims for the same private file", async () => {
    const conflicting = {
      ...association,
      override: { ...snapshot, sha256: "b".repeat(64) },
    };
    await expect(
      collectArtworkBackup(
        true,
        [
          { id: "e1", adventureArtwork: association },
          { id: "e2", adventureArtwork: conflicting },
        ],
        async () => [],
      ),
    ).rejects.toThrow("conflicting");
  });
});
