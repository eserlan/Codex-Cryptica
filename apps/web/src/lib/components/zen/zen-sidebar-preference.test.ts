import { beforeEach, describe, expect, it, vi } from "vitest";

const defaultStorage = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
      get length() {
        return values.size;
      },
      key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    },
  };
});

vi.mock("$lib/utils/runtime-deps", () => ({
  browserStorage: defaultStorage.storage,
}));

import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "./zen-sidebar-preference";
import type { StorageLike } from "$lib/utils/runtime-deps";

beforeEach(() => {
  defaultStorage.values.clear();
  vi.clearAllMocks();
});

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

  it("uses browserStorage and the sidebar preference key by default", () => {
    defaultStorage.values.set("zen-sidebar-collapsed", "1");

    expect(readSidebarCollapsed()).toBe(true);
    expect(defaultStorage.storage.getItem).toHaveBeenCalledWith(
      "zen-sidebar-collapsed",
    );

    writeSidebarCollapsed(false);
    expect(defaultStorage.storage.setItem).toHaveBeenCalledWith(
      "zen-sidebar-collapsed",
      "0",
    );
    expect(defaultStorage.values.get("zen-sidebar-collapsed")).toBe("0");
  });

  it("does not throw when storage is blocked", () => {
    const storage = createBlockedStorage();
    expect(readSidebarCollapsed(storage)).toBe(false);
    expect(() => writeSidebarCollapsed(true, storage)).not.toThrow();
  });
});
