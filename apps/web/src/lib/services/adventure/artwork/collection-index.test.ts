import { describe, expect, it } from "vitest";
import { CollectionIndex, type CollectionIndexState } from "./collection-index";

function harness() {
  let state: CollectionIndexState = {
    version: 1,
    collections: {},
    suppressed: [],
  };
  const files = new Map([
    ["a", 10],
    ["b", 20],
    ["c", 30],
  ]);
  const removed: string[] = [];
  const index = new CollectionIndex({
    lock: async (action) => action(),
    read: async () => structuredClone(state),
    write: async (value) => {
      state = structuredClone(value);
    },
    size: async (url) => files.get(url) ?? null,
    totalStoredBytes: async () =>
      [...files.values()].reduce((sum, value) => sum + value, 0),
    remove: async (url) => {
      files.delete(url);
      removed.push(url);
    },
  });
  return { index, files, removed, state: () => state };
}

describe("collection membership", () => {
  it("keeps shared files until the last collection is removed and suppresses removed IDs", async () => {
    const h = harness();
    expect(
      await h.index.install(
        "one",
        [
          { id: "a", bytes: 10 },
          { id: "b", bytes: 20 },
        ],
        new AbortController().signal,
      ),
    ).toBe(true);
    expect(
      await h.index.install(
        "two",
        [
          { id: "b", bytes: 20 },
          { id: "c", bytes: 30 },
        ],
        new AbortController().signal,
      ),
    ).toBe(true);
    expect(await h.index.remove("one")).toBe(true);
    expect(h.removed).toEqual(["a"]);
    expect(h.files.has("b")).toBe(true);
    expect(h.state().suppressed).toEqual(["one"]);
    expect(
      await h.index.install(
        "one",
        [{ id: "b", bytes: 20 }],
        new AbortController().signal,
      ),
    ).toBe(true);
    expect(h.state().suppressed).toEqual([]);
  });
  it("refuses missing files, conflicting sizes and cancelled installs", async () => {
    const h = harness();
    expect(
      await h.index.install(
        "one",
        [{ id: "a", bytes: 11 }],
        new AbortController().signal,
      ),
    ).toBe(false);
    expect(
      await h.index.install(
        "one",
        [{ id: "missing", bytes: 10 }],
        new AbortController().signal,
      ),
    ).toBe(false);
    const controller = new AbortController();
    controller.abort();
    expect(
      await h.index.install("one", [{ id: "a", bytes: 10 }], controller.signal),
    ).toBe(false);
    expect(h.state().collections).toEqual({});
  });
  it("does not remove files when saving removal state fails", async () => {
    const removed: string[] = [];
    const index = new CollectionIndex({
      lock: async (action) => action(),
      read: async () => ({
        version: 1,
        collections: { one: [{ id: "a", bytes: 10 }] },
        suppressed: [],
      }),
      write: async () => {
        throw new Error("storage unavailable");
      },
      size: async () => 10,
      totalStoredBytes: async () => 10,
      remove: async (id) => {
        removed.push(id);
      },
    });
    expect(await index.remove("one")).toBe(false);
    expect(removed).toEqual([]);
  });
});
