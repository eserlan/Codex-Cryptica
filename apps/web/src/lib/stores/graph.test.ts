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
vi.mock("./ui.svelte", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  const mockUi = new actual.UIStore();
  // Ensure we can track calls if needed, though real logic is better for state tests
  mockUi.toggleLabelFilter = vi.fn(mockUi.toggleLabelFilter.bind(mockUi));
  mockUi.clearLabelFilters = vi.fn(mockUi.clearLabelFilters.bind(mockUi));

  return {
    ...actual,
    ui: mockUi,
  };
});

// Mock graph-engine
vi.mock("graph-engine", () => ({
  GraphTransformer: {
    entitiesToElements: vi.fn().mockReturnValue([]),
  },
}));

// Mock schema
vi.mock("schema", () => ({
  isEntityVisible: vi.fn().mockReturnValue(true),
}));

import { graph, GraphStore } from "./graph.svelte";
import { vault } from "./vault.svelte";
import { ui } from "./ui.svelte";
import { GraphTransformer } from "graph-engine";
import { isEntityVisible } from "schema";

describe("GraphStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isEntityVisible as any).mockReturnValue(true);
    // Reset graph state
    graph.showLabels = true;
    graph.showImages = true;
    graph.stableLayout = true;
    graph.timelineMode = false;
    graph.orbitMode = false;
    graph.activeLabels = new Set();
    graph.activeCategories = new Set();
    graph.recentLabels = [];
    graph.eras = [];
    graph.centralNodeId = null;
    graph.labelFilterMode = "OR"; // Reset this explicitly

    // Reset mocks
    (vault as any).allEntities = [];
    (vault as any).isGuest = false;
    (ui as any).sharedMode = false;
  });

  it("should initialize with default values", () => {
    expect(graph.showLabels).toBe(true);
    expect(graph.showImages).toBe(true);
    expect(graph.stableLayout).toBe(true);
    expect(graph.timelineMode).toBe(false);
    expect(graph.orbitMode).toBe(false);
    expect(graph.labelFilterMode).toBe("OR");
  });

  it("should calculate elements and stats based on vault entities", () => {
    const mockEntities = [{ id: "1", type: "node" } as any];
    (vault as any).allEntities = mockEntities;

    const mockElements = [
      { id: "1", group: "nodes" },
      { id: "e1", group: "edges" },
    ];
    (GraphTransformer.entitiesToElements as any).mockReturnValue(mockElements);

    expect(graph.elements).toEqual(mockElements);
    expect(graph.stats).toEqual({ nodeCount: 1, edgeCount: 1 });
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
      if (key === "graphRecentLabels") return Promise.resolve(["old"]);
      if (key === "graphLabelFilterMode") return Promise.resolve("AND");
      return Promise.resolve(undefined);
    });
    vi.spyOn(db, "getAll").mockResolvedValue([{ id: "era1", name: "Era 1" }]);

    await graph.init();
    expect(graph.showLabels).toBe(false);
    expect(graph.showImages).toBe(false);
    expect(graph.stableLayout).toBe(false);
    expect(graph.recentLabels).toEqual(["old"]);
    expect(graph.labelFilterMode).toBe("AND");
    expect(graph.eras).toEqual([{ id: "era1", name: "Era 1" }]);
  });

  it("should add recent labels and persist them", async () => {
    const db = await getDB();
    const putSpy = vi.spyOn(db, "put");

    graph.recentLabels = ["a", "b"];
    await graph.addRecentLabel("c");

    expect(graph.recentLabels).toEqual(["c", "a", "b"]);
    expect(putSpy).toHaveBeenCalledWith(
      "settings",
      ["c", "a", "b"],
      "graphRecentLabels",
    );

    // Should move to top if already exists
    await graph.addRecentLabel("a");
    expect(graph.recentLabels).toEqual(["a", "c", "b"]);

    // Should limit to 5
    await graph.addRecentLabel("d");
    await graph.addRecentLabel("e");
    await graph.addRecentLabel("f");
    expect(graph.recentLabels).toHaveLength(5);
    expect(graph.recentLabels[0]).toBe("f");
    expect(graph.recentLabels).not.toContain("b");

    // Should ignore empty/whitespace
    const lengthBefore = graph.recentLabels.length;
    await graph.addRecentLabel("");
    await graph.addRecentLabel("  ");
    expect(graph.recentLabels).toHaveLength(lengthBefore);
  });

  it("should toggle labelFilterMode and persist it", async () => {
    const db = await getDB();
    const putSpy = vi.spyOn(db, "put");

    expect(graph.labelFilterMode).toBe("OR");

    await graph.toggleLabelFilterMode();
    expect(graph.labelFilterMode).toBe("AND");
    expect(putSpy).toHaveBeenCalledWith(
      "settings",
      "AND",
      "graphLabelFilterMode",
    );

    await graph.toggleLabelFilterMode();
    expect(graph.labelFilterMode).toBe("OR");
    expect(putSpy).toHaveBeenCalledWith(
      "settings",
      "OR",
      "graphLabelFilterMode",
    );
  });

  it("should handle fit requests", () => {
    const initial = graph.fitRequest;
    graph.requestFit();
    expect(graph.fitRequest).toBe(initial + 1);
  });

  it("should manage eras", async () => {
    const era = { id: "era-1", name: "New Era" } as any;

    await graph.addEra(era);
    expect(graph.eras.some((e) => e.id === "era-1")).toBe(true);

    await graph.removeEra("era-1");
    expect(graph.eras.some((e) => e.id === "era-1")).toBe(false);
  });

  it("should manage label filters", () => {
    graph.toggleLabelFilter("label1");
    expect(graph.activeLabels.has("label1")).toBe(true);

    graph.toggleLabelFilter("label1");
    expect(graph.activeLabels.has("label1")).toBe(false);

    graph.toggleLabelFilter("label2");
    graph.clearLabelFilters();
    expect(graph.activeLabels.size).toBe(0);
  });

  it("should manage category filters", () => {
    graph.toggleCategoryFilter("cat1");
    expect(graph.activeCategories.has("cat1")).toBe(true);

    graph.toggleCategoryFilter("cat1");
    expect(graph.activeCategories.has("cat1")).toBe(false);

    graph.toggleCategoryFilter("cat2");
    graph.clearCategoryFilters();
    expect(graph.activeCategories.size).toBe(0);
  });

  it("should manage timeline state", () => {
    graph.toggleTimeline();
    expect(graph.timelineMode).toBe(true);

    graph.setTimelineAxis("y");
    expect(graph.timelineAxis).toBe("y");

    graph.toggleTimeline();
    expect(graph.timelineMode).toBe(false);
  });

  it("should manage orbit state", () => {
    graph.toggleOrbit();
    expect(graph.orbitMode).toBe(true);

    graph.setCentralNode("node1");
    expect(graph.centralNodeId).toBe("node1");
    expect(graph.orbitMode).toBe(true);
    expect(graph.timelineMode).toBe(false);

    graph.toggleOrbit();
    expect(graph.orbitMode).toBe(false);
    expect(graph.centralNodeId).toBe(null);
  });

  it("should log visibility check for guests", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const testVault = {
      ...vault,
      isGuest: true,
      allEntities: [{ id: "1" } as any],
    };
    const testGraph = new GraphStore(testVault as any, ui as any);

    // Trigger elements derivation
    const _ = testGraph.elements;
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[GraphStore] Visibility Check:"),
      expect.anything(),
    );
  });

  it("should handle IDB errors gracefully in toggle methods", async () => {
    const db = await getDB();
    vi.spyOn(db, "put").mockRejectedValue(new Error("IDB Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await graph.toggleLabels();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to persist graphShowLabels"),
      expect.anything(),
    );

    await graph.toggleImages();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to persist graphShowImages"),
      expect.anything(),
    );

    await graph.toggleStableLayout();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to persist graphStableLayout"),
      expect.anything(),
    );

    await graph.toggleLabelFilterMode();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to persist graphLabelFilterMode"),
      expect.anything(),
    );

    await graph.addRecentLabel("test");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to persist graphRecentLabels"),
      expect.anything(),
    );
  });
});
