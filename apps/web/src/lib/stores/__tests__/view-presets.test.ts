import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseViewPresets,
  viewPresetsSettingsKey,
  legacyGraphPresetsSettingsKey,
  type ViewPresetState,
} from "../view-presets";
import { ViewPresetsStore } from "../view-presets.svelte";

describe("view-presets serialization & parsing", () => {
  const fakeClock = { now: () => 1234567890 };

  it("generates correct settings keys", () => {
    expect(viewPresetsSettingsKey("vault-1")).toBe("viewPresets:vault-1");
    expect(legacyGraphPresetsSettingsKey("vault-1")).toBe(
      "graphViewPresets:vault-1",
    );
  });

  it("parses valid unified view presets", () => {
    const raw = [
      {
        id: "p1",
        name: "Living Villains",
        createdAt: 1000,
        updatedAt: 2000,
        state: {
          activeLabels: ["villain"],
          labelFilterMode: "AND",
          activeCategories: ["character"],
          searchQuery: "#villain active",
          showIncompleteOnly: true,
          tableSort: { key: "title", direction: "desc" },
          columnFilters: {
            summaryMode: "has_summary",
            connectionsMode: "has_connections",
          },
        },
      },
    ];

    const presets = parseViewPresets(raw, fakeClock);
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe("p1");
    expect(presets[0].name).toBe("Living Villains");
    expect(presets[0].state.activeLabels).toEqual(["villain"]);
    expect(presets[0].state.searchQuery).toBe("#villain active");
    expect(presets[0].state.showIncompleteOnly).toBe(true);
    expect(presets[0].state.tableSort).toEqual({
      key: "title",
      direction: "desc",
    });
    expect(presets[0].state.columnFilters?.summaryMode).toBe("has_summary");
  });

  it("silently drops malformed entries and invalid objects", () => {
    const raw = [
      null,
      "invalid",
      { id: "missing-name", state: { activeLabels: [] } },
      { name: "missing-id", state: { activeLabels: [] } },
      { id: "valid-1", name: "Valid Preset", state: { activeLabels: [] } },
    ];

    const presets = parseViewPresets(raw, fakeClock);
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe("valid-1");
  });

  it("preserves graph layout properties from legacy presets", () => {
    const legacyRaw = [
      {
        id: "legacy-g1",
        name: "Timeline View",
        createdAt: 1000,
        updatedAt: 1000,
        state: {
          activeLabels: ["historical"],
          activeCategories: ["event"],
          timelineMode: true,
          timelineAxis: "y",
          timelineScale: 150,
          orbitMode: false,
          viewport: { pan: { x: 100, y: 200 }, zoom: 1.5 },
        },
      },
    ];

    const presets = parseViewPresets(legacyRaw, fakeClock);
    expect(presets).toHaveLength(1);
    expect(presets[0].state.timelineMode).toBe(true);
    expect(presets[0].state.timelineAxis).toBe("y");
    expect(presets[0].state.timelineScale).toBe(150);
    expect(presets[0].state.viewport).toEqual({
      pan: { x: 100, y: 200 },
      zoom: 1.5,
    });
  });
});

describe("ViewPresetsStore", () => {
  let store: ViewPresetsStore;
  let mockDb: {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };
  const mockClock = { now: () => 5000 };
  let idCounter = 1;
  const mockIdGenerator = { uuid: () => `uuid-${idCounter++}` };

  beforeEach(async () => {
    idCounter = 1;
    mockDb = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };

    store = new ViewPresetsStore({
      clock: mockClock,
      idGenerator: mockIdGenerator,
      getDb: vi.fn().mockResolvedValue(mockDb) as any,
    });
  });

  it("loads presets and falls back to migrate legacy graph presets", async () => {
    mockDb.get.mockImplementation(async (_storeName, key) => {
      if (key === "viewPresets:v1") return null;
      if (key === "graphViewPresets:v1") {
        return [
          {
            id: "legacy-1",
            name: "Graph Preset",
            createdAt: 1000,
            updatedAt: 1000,
            state: { activeLabels: ["tag1"], activeCategories: [] },
          },
        ];
      }
      return null;
    });

    const result = await store.loadPresets("v1");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Graph Preset");
    // Verify migration put was called for primary key
    expect(mockDb.put).toHaveBeenCalledWith(
      "settings",
      expect.anything(),
      "viewPresets:v1",
    );
  });

  it("saves, renames, applies and deletes presets", async () => {
    const sampleState: ViewPresetState = {
      activeLabels: ["lead"],
      labelFilterMode: "OR",
      activeCategories: ["faction"],
      searchQuery: "rebel",
      showIncompleteOnly: false,
    };

    const saved = await store.savePreset("v1", "Rebel View", sampleState);
    expect(saved).not.toBeNull();
    expect(saved?.name).toBe("Rebel View");
    expect(store.presets).toHaveLength(1);
    expect(store.activePresetId).toBe(saved?.id);

    // Rename
    await store.renamePreset("v1", saved!.id, "All Rebels");
    expect(store.presets[0].name).toBe("All Rebels");

    // Apply
    const applied = store.applyPreset(saved!.id);
    expect(applied?.name).toBe("All Rebels");
    expect(store.activePresetId).toBe(saved!.id);

    // Delete
    await store.deletePreset("v1", saved!.id);
    expect(store.presets).toHaveLength(0);
    expect(store.activePresetId).toBeNull();
  });

  it("synchronizes presets between Table capture and Graph application", async () => {
    const tableCapturedState: ViewPresetState = {
      activeCategories: ["character", "location"],
      activeLabels: ["plot-critical"],
      labelFilterMode: "AND",
      searchQuery: "dragon",
      showIncompleteOnly: true,
      tableSort: { key: "created", direction: "desc" },
      columnFilters: { connectionsMode: "has_connections" },
    };

    const savedFromTable = await store.savePreset(
      "v1",
      "Dragon Arc",
      tableCapturedState,
    );
    expect(savedFromTable).not.toBeNull();

    // Verify when loaded on another view, shared content filters are intact
    const reloaded = store.applyPreset(savedFromTable!.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.state.activeCategories).toEqual(["character", "location"]);
    expect(reloaded?.state.activeLabels).toEqual(["plot-critical"]);
    expect(reloaded?.state.searchQuery).toBe("dragon");
    expect(reloaded?.state.showIncompleteOnly).toBe(true);
    expect(reloaded?.state.tableSort).toEqual({
      key: "created",
      direction: "desc",
    });
    expect(reloaded?.state.columnFilters?.connectionsMode).toBe(
      "has_connections",
    );
  });

  it("resets activePresetId when switching between different vaults", async () => {
    mockDb.get.mockImplementation(async (_storeName, key) => {
      if (key === "viewPresets:vault-A") {
        return [
          {
            id: "preset-A",
            name: "Vault A View",
            createdAt: 1000,
            updatedAt: 1000,
            state: { activeLabels: [], activeCategories: [] },
          },
        ];
      }
      if (key === "viewPresets:vault-B") {
        return [
          {
            id: "preset-B",
            name: "Vault B View",
            createdAt: 1000,
            updatedAt: 1000,
            state: { activeLabels: [], activeCategories: [] },
          },
        ];
      }
      return null;
    });

    await store.loadPresets("vault-A");
    store.applyPreset("preset-A");
    expect(store.activePresetId).toBe("preset-A");

    // Switching to vault-B should clear active preset
    await store.loadPresets("vault-B");
    expect(store.activePresetId).toBeNull();
    expect(store.presets[0].name).toBe("Vault B View");

    // Unloading vault should clear active preset and preset list
    await store.loadPresets(null);
    expect(store.activePresetId).toBeNull();
    expect(store.presets).toEqual([]);
  });
});
