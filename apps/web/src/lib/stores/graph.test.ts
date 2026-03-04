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
    // Reset graph state
    graph.showLabels = true;
    graph.showImages = true;
    graph.stableLayout = true;
    graph.timelineMode = false;
    graph.orbitMode = false;
  });

  it("should initialize with default values", () => {
    expect(graph.showLabels).toBe(true);
    expect(graph.showImages).toBe(true);
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

  it("should toggle images and persist to IDB", async () => {
    const db = await getDB();
    const putSpy = vi.spyOn(db, "put");

    await graph.toggleImages();
    expect(graph.showImages).toBe(false);
    expect(putSpy).toHaveBeenCalledWith("settings", false, "graphShowImages");

    await graph.toggleImages();
    expect(graph.showImages).toBe(true);
    expect(putSpy).toHaveBeenCalledWith("settings", true, "graphShowImages");
  });

  it("should toggle labels and persist to IDB", async () => {
    const db = await getDB();
    const putSpy = vi.spyOn(db, "put");

    await graph.toggleLabels();
    expect(graph.showLabels).toBe(false);
    expect(putSpy).toHaveBeenCalledWith("settings", false, "graphShowLabels");

    await graph.toggleLabels();
    expect(graph.showLabels).toBe(true);
    expect(putSpy).toHaveBeenCalledWith("settings", true, "graphShowLabels");
  });

  it("should load saved settings on init", async () => {
    const db = await getDB();
    vi.spyOn(db, "get").mockImplementation((_store, key) => {
      if (key === "graphShowLabels") return Promise.resolve(false);
      if (key === "graphShowImages") return Promise.resolve(false);
      if (key === "graphStableLayout") return Promise.resolve(false);
      return Promise.resolve(undefined);
    });

    await graph.init();
    expect(graph.showLabels).toBe(false);
    expect(graph.showImages).toBe(false);
    expect(graph.stableLayout).toBe(false);
  });
});
