import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Svelte 5 Runes
vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = (fn: any) => fn();
  (global as any).$effect = (v: any) => v;
});

// Mock IndexedDB
import { getDB } from "../utils/idb";
vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    transaction: vi.fn().mockReturnValue({
      store: {
        clear: vi.fn(),
        put: vi.fn(),
      },
      done: Promise.resolve(),
    }),
  }),
}));

// Mock vault store
vi.mock("./vault.svelte", () => ({
  vault: {
    allEntities: [],
    isGuest: false,
    defaultVisibility: "private",
    entities: {},
  },
}));

// Mock ui store
vi.mock("./ui.svelte", () => ({
  ui: {
    sharedMode: false,
  },
}));

// Mock graph-engine
vi.mock("graph-engine", () => ({
  GraphTransformer: {
    entitiesToElements: vi.fn().mockReturnValue([]),
  },
}));

import { graph } from "./graph.svelte";

describe("GraphStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with stableLayout as true by default", () => {
    expect(graph.stableLayout).toBe(true);
  });

  it("should toggle stableLayout and persist it", async () => {
    const db = await getDB();
    const putSpy = vi.spyOn(db, "put");

    await graph.toggleStableLayout();
    expect(graph.stableLayout).toBe(false);
    expect(putSpy).toHaveBeenCalledWith("settings", false, "graphStableLayout");

    await graph.toggleStableLayout();
    expect(graph.stableLayout).toBe(true);
    expect(putSpy).toHaveBeenCalledWith("settings", true, "graphStableLayout");
  });

  it("should load stableLayout from IndexedDB on init", async () => {
    const db = await getDB();
    vi.spyOn(db, "get").mockImplementation((store, key) => {
      if (store === "settings" && key === "graphStableLayout") {
        return Promise.resolve(false);
      }
      return Promise.resolve(undefined);
    });

    await graph.init();
    expect(graph.stableLayout).toBe(false);
  });
});
