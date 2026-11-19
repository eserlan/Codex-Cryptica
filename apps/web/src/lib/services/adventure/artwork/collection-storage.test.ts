import { describe, expect, it } from "vitest";
import {
  readCollectionIndex,
  writeCollectionIndex,
  COLLECTION_INDEX_KEY,
} from "./collection-storage";

describe("collection index storage", () => {
  it("round trips memberships and returns an empty index before first use", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    expect(readCollectionIndex(storage).collections).toEqual({});
    const value = {
      version: 1 as const,
      collections: {
        forest: [
          {
            id: "https://assets.codexcryptica.com/adventure-artwork/forest.webp",
            bytes: 10,
          },
        ],
      },
      suppressed: ["removed"],
    };
    writeCollectionIndex(storage, value);
    expect(readCollectionIndex(storage)).toEqual(value);
    expect(values.has(COLLECTION_INDEX_KEY)).toBe(true);
  });
  it("fails closed for corrupted or unsafe index data", () => {
    for (const value of [
      "bad json",
      JSON.stringify({ version: 2, collections: {}, suppressed: [] }),
      JSON.stringify({
        version: 1,
        collections: {
          forest: [{ id: "images/artwork_private.png", bytes: 10 }],
        },
        suppressed: [],
      }),
    ]) {
      expect(() => readCollectionIndex({ getItem: () => value })).toThrow();
    }
  });
});
