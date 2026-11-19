import { describe, expect, it, vi } from "vitest";
import {
  inspectSnapshotReferences,
  SnapshotCleanup,
} from "./snapshot-references";

const path = "images/artwork_one.png";
const snapshot = {
  version: 1,
  override: {
    kind: "snapshot",
    path,
    mime: "image/png",
    bytes: 1,
    width: 1,
    height: 1,
    sha256: "a".repeat(64),
  },
};
const state = (association: unknown) => ({
  version: 1,
  associations: [{ subject: { kind: "place", id: "p" }, association }],
});

describe("snapshot reference safety", () => {
  it("finds references in entities and adventures, including thumbnails", () => {
    expect(
      inspectSnapshotReferences(path, [{ adventureArtwork: snapshot }], []),
    ).toBe("referenced");
    expect(
      inspectSnapshotReferences(path, [], [{ artwork: state(snapshot) }]),
    ).toBe("referenced");
    expect(
      inspectSnapshotReferences(
        path,
        [
          {
            adventureArtwork: {
              ...snapshot,
              override: {
                ...snapshot.override,
                path: "images/artwork_other.png",
                thumbnailPath: path,
              },
            },
          },
        ],
        [],
      ),
    ).toBe("referenced");
  });
  it("refuses cleanup for unknown shapes, pending links and unreadable owners", () => {
    expect(
      inspectSnapshotReferences(
        path,
        [{ adventureArtwork: { version: 2 } }],
        [],
      ),
    ).toBe("unknown");
    expect(
      inspectSnapshotReferences(
        path,
        [],
        [
          {
            artwork: {
              version: 1,
              associations: [],
              pendingCanonicalLinks: [{}],
            },
          },
        ],
      ),
    ).toBe("unknown");
    expect(inspectSnapshotReferences(path, [], [null])).toBe("unknown");
  });
  it("deletes only after a complete scan within an exclusive transaction", async () => {
    const events: string[] = [];
    const remove = vi.fn(async () => {
      events.push("remove");
    });
    const cleanup = new SnapshotCleanup({
      exclusive: async (action) => {
        events.push("lock");
        const result = await action();
        events.push("unlock");
        return result;
      },
      owners: async () => {
        events.push("scan");
        return { entities: [], adventures: [] };
      },
      remove,
    });
    expect(await cleanup.removeIfUnreferenced(path)).toBe(true);
    expect(events).toEqual(["lock", "scan", "remove", "unlock"]);
    expect(remove).toHaveBeenCalledWith(path);
  });
  it("keeps files on scan failure or an unsafe path", async () => {
    const remove = vi.fn();
    const cleanup = new SnapshotCleanup({
      exclusive: async (action) => action(),
      owners: async () => {
        throw new Error("unavailable");
      },
      remove,
    });
    expect(await cleanup.removeIfUnreferenced(path)).toBe(false);
    expect(await cleanup.removeIfUnreferenced("../bad")).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });
  it("retains a file shared by another owner and refuses unsupported lock access", async () => {
    const remove = vi.fn();
    const shared = new SnapshotCleanup({
      exclusive: async (action) => action(),
      owners: async () => ({
        entities: [{ adventureArtwork: snapshot }],
        adventures: [],
      }),
      remove,
    });
    expect(await shared.removeIfUnreferenced(path)).toBe(false);
    const noLock = new SnapshotCleanup({
      exclusive: async () => {
        throw new Error("lock unavailable");
      },
      owners: async () => ({ entities: [], adventures: [] }),
      remove,
    });
    expect(await noLock.removeIfUnreferenced(path)).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });
});
