import { describe, it, expect, vi, beforeEach } from "vitest";
import { graph } from "./graph.svelte";
import { getDB } from "../utils/idb";

// Mock dependencies
vi.mock("./vault.svelte", () => ({
  vault: {
    allEntities: [],
    defaultVisibility: "visible",
    activeVaultId: "v1",
    isInitialized: true,
  },
}));

vi.mock("./ui.svelte", () => ({
  ui: {
    sharedMode: false,
  },
}));

vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
  }),
}));

describe("GraphStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset graph state
    graph.showLabels = true;
    graph.showImages = true;
    graph.timelineMode = false;
    graph.orbitMode = false;
  });

  it("should initialize with default values", () => {
    expect(graph.showLabels).toBe(true);
    expect(graph.showImages).toBe(true);
  });

  it("should toggle images and persist to IDB", async () => {
    const mockDB = {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(true),
      getAll: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDB).mockResolvedValue(mockDB as any);

    await graph.toggleImages();
    expect(graph.showImages).toBe(false);
    expect(mockDB.put).toHaveBeenCalledWith(
      "settings",
      false,
      "graphShowImages",
    );

    await graph.toggleImages();
    expect(graph.showImages).toBe(true);
    expect(mockDB.put).toHaveBeenCalledWith(
      "settings",
      true,
      "graphShowImages",
    );
  });

  it("should toggle labels and persist to IDB", async () => {
    const mockDB = {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(true),
      getAll: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDB).mockResolvedValue(mockDB as any);

    await graph.toggleLabels();
    expect(graph.showLabels).toBe(false);
    expect(mockDB.put).toHaveBeenCalledWith(
      "settings",
      false,
      "graphShowLabels",
    );

    await graph.toggleLabels();
    expect(graph.showLabels).toBe(true);
    expect(mockDB.put).toHaveBeenCalledWith(
      "settings",
      true,
      "graphShowLabels",
    );
  });

  it("should load saved settings on init", async () => {
    const mockDB = {
      get: vi.fn().mockImplementation((store, key) => {
        if (key === "graphShowLabels") return false;
        if (key === "graphShowImages") return false;
        return undefined;
      }),
      getAll: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDB).mockResolvedValue(mockDB as any);

    await graph.init();
    expect(graph.showLabels).toBe(false);
    expect(graph.showImages).toBe(false);
  });
});
