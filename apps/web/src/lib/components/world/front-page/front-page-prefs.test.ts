import { beforeEach, describe, expect, it } from "vitest";
import {
  clampRecentLimit,
  getRecentLimitStorageKey,
  persistRecentLimit,
  readRecentLimit,
} from "./front-page-prefs";
import { DEFAULT_RECENT_LIMIT } from "./front-page-constants";
import type { StorageLike } from "$lib/utils/runtime-deps";

function createMockStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    get length() {
      return store.size;
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
  };
}

describe("front-page-prefs", () => {
  describe("getRecentLimitStorageKey", () => {
    it("returns a vault-scoped key", () => {
      expect(getRecentLimitStorageKey("vault-1")).toBe(
        "codex_front_page_recent_limit:vault-1",
      );
      expect(getRecentLimitStorageKey("my-world")).toBe(
        "codex_front_page_recent_limit:my-world",
      );
    });
  });

  describe("clampRecentLimit", () => {
    it("clamps values below minimum to MIN", () => {
      expect(clampRecentLimit(0)).toBe(1);
      expect(clampRecentLimit(-5)).toBe(1);
    });

    it("clamps values above maximum to MAX", () => {
      expect(clampRecentLimit(25)).toBe(24);
      expect(clampRecentLimit(100)).toBe(24);
    });

    it("returns the default for NaN", () => {
      expect(clampRecentLimit(NaN)).toBe(DEFAULT_RECENT_LIMIT);
    });

    it("returns the value when in range", () => {
      expect(clampRecentLimit(6)).toBe(6);
      expect(clampRecentLimit(1)).toBe(1);
      expect(clampRecentLimit(24)).toBe(24);
    });
  });

  describe("readRecentLimit", () => {
    let mockStorage: StorageLike;

    beforeEach(() => {
      mockStorage = createMockStorage();
    });

    it("returns the default when no key exists", () => {
      expect(readRecentLimit("vault-1", mockStorage)).toBe(
        DEFAULT_RECENT_LIMIT,
      );
    });

    it("returns the stored value when valid", () => {
      mockStorage.setItem("codex_front_page_recent_limit:vault-1", "10");
      expect(readRecentLimit("vault-1", mockStorage)).toBe(10);
    });

    it("returns the default when the stored value is not a number", () => {
      mockStorage.setItem("codex_front_page_recent_limit:vault-1", "abc");
      expect(readRecentLimit("vault-1", mockStorage)).toBe(
        DEFAULT_RECENT_LIMIT,
      );
    });

    it("clamps the stored value to the allowed range", () => {
      mockStorage.setItem("codex_front_page_recent_limit:vault-1", "50");
      expect(readRecentLimit("vault-1", mockStorage)).toBe(24);
    });
  });

  describe("persistRecentLimit", () => {
    let mockStorage: StorageLike;

    beforeEach(() => {
      mockStorage = createMockStorage();
    });

    it("writes the limit to storage", () => {
      persistRecentLimit("vault-1", 8, mockStorage);
      expect(mockStorage.getItem("codex_front_page_recent_limit:vault-1")).toBe(
        "8",
      );
    });
  });
});
