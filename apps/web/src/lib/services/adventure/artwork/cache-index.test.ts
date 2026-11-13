import { describe, expect, it } from "vitest";
import { ArtworkCacheIndex } from "./cache-index";
const mib = 1024 * 1024;
describe("artwork cache index", () => {
  it("evicts the oldest unprotected entry before recording a new one", async () => {
    let entries = [
      { id: "old", bytes: 20 * mib, lastUsed: 1, protected: false },
      { id: "new", bytes: 10 * mib, lastUsed: 2, protected: false },
    ];
    const removed: string[] = [];
    const index = new ArtworkCacheIndex(
      {
        read: async () => entries,
        write: async (value) => {
          entries = value;
        },
        remove: async (id) => {
          removed.push(id);
        },
      },
      () => 3,
    );
    expect(await index.record("incoming", 10 * mib)).toBe(true);
    expect(removed).toEqual(["old"]);
    expect(entries.map((entry) => entry.id)).toEqual(["new", "incoming"]);
  });
  it("does not update the index if eviction fails", async () => {
    let writes = 0;
    const index = new ArtworkCacheIndex({
      read: async () => [
        { id: "old", bytes: 32 * mib, lastUsed: 1, protected: false },
      ],
      write: async () => {
        writes++;
      },
      remove: async () => {
        throw new Error("unavailable");
      },
    });
    expect(await index.record("new", 1)).toBe(false);
    expect(writes).toBe(0);
  });
});

it("uses a shared exclusion boundary for the complete read-evict-write transaction", async () => {
  const events: string[] = [];
  const index = new ArtworkCacheIndex({
    read: async () => {
      events.push("read");
      return [];
    },
    write: async () => {
      events.push("write");
    },
    remove: async () => {},
    withLock: async (action) => {
      events.push("lock");
      try {
        return await action();
      } finally {
        events.push("unlock");
      }
    },
  });
  expect(await index.record("one", 2)).toBe(true);
  expect(events).toEqual(["lock", "read", "write", "unlock"]);
});
