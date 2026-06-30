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
    inboundConnections: {},
    selectedEntityId: null,
  },
}));

// Mock graph-engine
vi.mock("graph-engine", () => ({
  GraphTransformer: {
    entitiesToElements: vi.fn().mockReturnValue([]),
  },
  isLargeGraphSize: (nodeCount: number, edgeCount: number) =>
    nodeCount > 700 || edgeCount > 1800,
}));

vi.mock("schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("schema")>();
  return {
    ...actual,
    isEntityVisible: vi.fn().mockReturnValue(true),
  };
});

import { FOCUS_BASE_COUNT, graph, GraphStore } from "./graph.svelte";
import { vault } from "./vault.svelte";
import { GraphTransformer } from "graph-engine";
import { isEntityVisible } from "schema";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";

describe("GraphStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isEntityVisible as any).mockReturnValue(true);
    // Reset the transform impl each test (clearAllMocks keeps implementations).
    (GraphTransformer.entitiesToElements as any).mockReset();
    (GraphTransformer.entitiesToElements as any).mockReturnValue([]);
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
    (graph as any)._initPromise = null;

    // Reset mocks
    (vault as any).allEntities = [];
    (vault as any).entities = {};
    (vault as any).isGuest = false;
    (vault as any).activeVaultId = "vault-1";
    (vault as any).selectedEntityId = null;
    (vault as any).inboundConnections = {};
    graph.viewPresets = [];
    sessionModeStore.sharedMode = false;
    explorerUIStore.labelFilters = new Set();
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

    const store = new GraphStore();

    expect(store.elements).toEqual(mockElements);
    expect(graph.stats).toEqual({ nodeCount: 1, edgeCount: 1 });
  });

  it("culls large vaults to a target-sized focus view by default", () => {
    const mockEntities = Array.from({ length: 701 }, (_, index) => ({
      id: `node-${index}`,
      type: "npc",
      title: `Node ${index}`,
      // Sparse local neighborhood: without target filling this would render
      // only the focal node and three direct neighbors.
      connections:
        index === 0
          ? [{ target: "node-1" }, { target: "node-2" }, { target: "node-3" }]
          : [],
    })) as any[];
    (vault as any).allEntities = mockEntities;
    (vault as any).entities = Object.fromEntries(
      mockEntities.map((e) => [e.id, e]),
    );
    (vault as any).selectedEntityId = "node-0";
    (GraphTransformer.entitiesToElements as any).mockImplementation(
      (entities: any[]) =>
        entities.map((e) => ({ group: "nodes", data: { id: e.id } })),
    );

    const store = new GraphStore();

    expect(store.isLargeGraph).toBe(true);
    expect(store.focusViewActive).toBe(true);
    expect(store.focusDepth).toBe(1);

    const renderedIds = new Set(store.elements.map((el: any) => el.data.id));
    expect(renderedIds.size).toBe(FOCUS_BASE_COUNT);
    expect(renderedIds.has("node-0")).toBe(true);
    expect(renderedIds.has("node-1")).toBe(true);
    expect(renderedIds.has("node-2")).toBe(true);
    expect(renderedIds.has("node-3")).toBe(true);
  });

  it("caps the focus view at the visible entity count", () => {
    const visibleCount = FOCUS_BASE_COUNT - 70;
    const mockEntities = Array.from({ length: 701 }, (_, index) => ({
      id: `node-${index}`,
      type: "npc",
      title: `Node ${index}`,
      connections: index === 0 ? [{ target: "node-1" }] : [],
    })) as any[];
    (vault as any).allEntities = mockEntities;
    (vault as any).entities = Object.fromEntries(
      mockEntities.map((e) => [e.id, e]),
    );
    (vault as any).selectedEntityId = "node-0";
    (isEntityVisible as any).mockImplementation((entity: any) => {
      const index = Number(entity.id.replace("node-", ""));
      return index < visibleCount;
    });
    (GraphTransformer.entitiesToElements as any).mockImplementation(
      (entities: any[]) =>
        entities.map((e) => ({ group: "nodes", data: { id: e.id } })),
    );

    const store = new GraphStore();

    expect(store.isLargeGraph).toBe(true);
    expect(store.focusViewActive).toBe(true);
    const renderedIds = new Set(store.elements.map((el: any) => el.data.id));
    expect(renderedIds.size).toBe(visibleCount);
    expect(renderedIds.has(`node-${visibleCount}`)).toBe(false);
  });

  it("falls back to the highest-degree hub when nothing is selected", () => {
    const mockEntities = Array.from({ length: 701 }, (_, index) => ({
      id: `node-${index}`,
      type: "npc",
      title: `Node ${index}`,
      // node-5 is the hub: connected to four others.
      connections:
        index === 5
          ? [
              { target: "node-6" },
              { target: "node-7" },
              { target: "node-8" },
              { target: "node-9" },
            ]
          : [],
    })) as any[];
    (vault as any).allEntities = mockEntities;
    (vault as any).entities = Object.fromEntries(
      mockEntities.map((e) => [e.id, e]),
    );
    (vault as any).selectedEntityId = null;
    (GraphTransformer.entitiesToElements as any).mockImplementation(
      (entities: any[]) =>
        entities.map((e) => ({ group: "nodes", data: { id: e.id } })),
    );

    const store = new GraphStore();
    expect(store.focusViewActive).toBe(true);

    const renderedIds = new Set(store.elements.map((el: any) => el.data.id));
    expect(renderedIds.size).toBe(FOCUS_BASE_COUNT);
    expect(renderedIds.has("node-5")).toBe(true);
    expect(renderedIds.has("node-6")).toBe(true);
    expect(renderedIds.has("node-7")).toBe(true);
    expect(renderedIds.has("node-8")).toBe(true);
    expect(renderedIds.has("node-9")).toBe(true);
  });

  it("toggleFullGraph flips the showFullGraph flag", () => {
    const store = new GraphStore();
    expect(store.showFullGraph).toBe(false);
    store.toggleFullGraph();
    expect(store.showFullGraph).toBe(true);
    store.toggleFullGraph();
    expect(store.showFullGraph).toBe(false);
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

  it("should only initialize persisted graph state once", async () => {
    const db = await getDB();
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const getSpy = vi.spyOn(db, "get").mockResolvedValue(undefined);
    const getAllSpy = vi.spyOn(db, "getAll").mockResolvedValue([]);

    await graph.init();
    await graph.init();

    expect(getAllSpy).toHaveBeenCalledTimes(1);
    // 5 global graph settings + 1 vault-scoped view presets key
    expect(getSpy).toHaveBeenCalledTimes(6);
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    addEventListenerSpy.mockRestore();
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

  describe("view presets", () => {
    it("should save a preset capturing current state and persist it", async () => {
      graph.activeLabels = new Set(["arc"]);
      graph.labelFilterMode = "AND";
      graph.activeCategories = new Set(["person"]);
      graph.showImages = false;

      const preset = await graph.saveViewPreset("Quest Arc", {
        pan: { x: 5, y: 6 },
        zoom: 2,
      });

      expect(preset).not.toBeNull();
      expect(preset!.name).toBe("Quest Arc");
      expect(preset!.state.activeLabels).toEqual(["arc"]);
      expect(preset!.state.labelFilterMode).toBe("AND");
      expect(preset!.state.activeCategories).toEqual(["person"]);
      expect(preset!.state.showImages).toBe(false);
      expect(preset!.state.viewport).toEqual({ pan: { x: 5, y: 6 }, zoom: 2 });
      expect(graph.viewPresets).toHaveLength(1);

      const db = await getDB();
      expect(db.put).toHaveBeenCalledWith(
        "settings",
        expect.arrayContaining([
          expect.objectContaining({ name: "Quest Arc" }),
        ]),
        "graphViewPresets:vault-1",
      );
    });

    it("should reject empty preset names", async () => {
      expect(await graph.saveViewPreset("   ")).toBeNull();
      expect(graph.viewPresets).toHaveLength(0);
    });

    it("should apply a preset and report mode changes", async () => {
      (vault as any).allEntities = [
        { id: "e1", type: "person", labels: ["Arc"] },
      ];
      const preset = await graph.saveViewPreset("base");
      graph.activeLabels = new Set();
      graph.timelineMode = true;

      const result = graph.applyViewPreset(preset!.id);

      expect(result).not.toBeNull();
      expect(result!.modeChanged).toBe(true); // timeline true -> false
      expect(graph.timelineMode).toBe(false);
    });

    it("should skip filters and orbit centers that no longer exist", async () => {
      graph.activeLabels = new Set(["arc", "gone-label"]);
      graph.activeCategories = new Set(["person", "gone-type"]);
      graph.setCentralNode("deleted-node");
      const preset = await graph.saveViewPreset("drifted");

      (vault as any).allEntities = [
        { id: "e1", type: "person", labels: ["Arc"] },
      ];
      graph.activeLabels = new Set();
      graph.activeCategories = new Set();
      graph.orbitMode = false;
      graph.centralNodeId = null;

      graph.applyViewPreset(preset!.id);

      expect(Array.from(graph.activeLabels)).toEqual(["arc"]);
      expect(Array.from(graph.activeCategories)).toEqual(["person"]);
      expect(graph.centralNodeId).toBeNull();
      expect(graph.orbitMode).toBe(false);
    });

    it("should return null when applying an unknown preset", () => {
      expect(graph.applyViewPreset("nope")).toBeNull();
    });

    it("should rename and delete presets with persistence", async () => {
      const preset = await graph.saveViewPreset("old name");
      await graph.renameViewPreset(preset!.id, "new name");
      expect(graph.viewPresets[0].name).toBe("new name");

      await graph.deleteViewPreset(preset!.id);
      expect(graph.viewPresets).toHaveLength(0);

      const db = await getDB();
      expect(db.put).toHaveBeenLastCalledWith(
        "settings",
        [],
        "graphViewPresets:vault-1",
      );
    });

    it("should ignore malformed persisted preset data on load", async () => {
      const db = await getDB();
      (db.get as any).mockResolvedValue([
        { id: "bad" },
        "junk",
        {
          id: "ok",
          name: "Valid",
          state: {
            activeLabels: [],
            activeCategories: [],
          },
        },
      ]);

      await graph.loadViewPresets();

      expect(graph.viewPresets).toHaveLength(1);
      expect(graph.viewPresets[0].name).toBe("Valid");
    });

    it("should recover with empty presets when loading fails", async () => {
      const db = await getDB();
      (db.get as any).mockRejectedValue(new Error("IDB Error"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      graph.viewPresets = [{ id: "stale" } as any];
      await graph.loadViewPresets();

      expect(graph.viewPresets).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load graph view presets"),
        expect.anything(),
      );
    });
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
