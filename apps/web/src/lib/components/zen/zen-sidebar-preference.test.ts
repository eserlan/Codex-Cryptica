import { describe, expect, it } from "vitest";
import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "./zen-sidebar-preference";
import type { StorageLike } from "$lib/utils/runtime-deps";

function createMemoryStorage(): StorageLike {
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

function createBlockedStorage(): StorageLike {
  return {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
    get length() {
      return 0;
    },
    key: () => null,
  };
}

describe("zen sidebar preference", () => {
  it("defaults to shown", () => {
    const storage = createMemoryStorage();
    expect(readSidebarCollapsed(storage)).toBe(false);
  });

  it("remembers a collapsed sidebar and a restored one", () => {
    const storage = createMemoryStorage();
    writeSidebarCollapsed(true, storage);
    expect(readSidebarCollapsed(storage)).toBe(true);
    writeSidebarCollapsed(false, storage);
    expect(readSidebarCollapsed(storage)).toBe(false);
  });

  // Test the default storage fallback functionality without needing vi.mock globally
  it("uses browserStorage by default to read and write", () => {
    // Because vitest environment is default (not jsdom), global localStorage is undefined.
    // The browserStorage implementation inside runtime-deps safely handles missing localStorage
    // and returns null (which causes readSidebarCollapsed to return false).
    expect(readSidebarCollapsed()).toBe(false);
    expect(() => writeSidebarCollapsed(true)).not.toThrow();
  });

  it("does not throw when storage is blocked", () => {
    const storage = createBlockedStorage();
    expect(readSidebarCollapsed(storage)).toBe(false);
    expect(() => writeSidebarCollapsed(true, storage)).not.toThrow();
  });
});
