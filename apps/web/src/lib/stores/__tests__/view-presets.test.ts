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

describe("view-presets layout snapshots (#3456)", () => {
  const fakeClock = { now: () => 1234567890 };
  const baseState = {
    activeLabels: ["villain"],
    labelFilterMode: "OR",
    activeCategories: [],
    viewport: { pan: { x: 5, y: -7 }, zoom: 1.25 },
  };
  const parseOne = (state: Record<string, unknown>) =>
    parseViewPresets(
      [{ id: "p1", name: "View", createdAt: 1, updatedAt: 1, state }],
      fakeClock,
    )[0];

  it("keeps a saved layout with its positions", () => {
    const preset = parseOne({
      ...baseState,
      layout: { positions: { a: { x: 10, y: 20 }, b: { x: -5.5, y: 0 } } },
    });

    expect(preset.state.layout).toEqual({
      positions: { a: { x: 10, y: 20 }, b: { x: -5.5, y: 0 } },
    });
    expect(preset.state.viewport).toEqual({
      pan: { x: 5, y: -7 },
      zoom: 1.25,
    });
  });

  it("reads views saved before layouts existed as views with no layout (backwards compatible)", () => {
    const preset = parseOne(baseState);

    expect(preset.state.layout).toBeUndefined();
    expect("layout" in preset.state).toBe(false);
    expect(preset.state.activeLabels).toEqual(["villain"]);
  });

  it("drops positions that are not finite numbers and keeps the rest", () => {
    const preset = parseOne({
      ...baseState,
      layout: {
        positions: {
          ok: { x: 1, y: 2 },
          nan: { x: Number.NaN, y: 2 },
          text: { x: "1", y: 2 },
          missing: { x: 1 },
          nothing: null,
          inf: { x: Infinity, y: 0 },
        },
      },
    });

    expect(Object.keys(preset.state.layout!.positions)).toEqual(["ok"]);
  });

  it("treats an unreadable layout as no layout without losing the view (negative)", () => {
    for (const layout of [
      "nonsense",
      42,
      null,
      [],
      {},
      { positions: "x" },
      { positions: [] },
      { positions: { a: { x: "no", y: "no" } } },
    ]) {
      const preset = parseOne({ ...baseState, layout });

      expect(preset, JSON.stringify(layout)).toBeDefined();
      expect(preset.state.layout, JSON.stringify(layout)).toBeUndefined();
      expect(preset.state.activeLabels).toEqual(["villain"]);
    }
  });

  it("ignores keys that could pollute object prototypes (negative)", () => {
    const raw = JSON.parse(
      '{"activeLabels":[],"layout":{"positions":{"__proto__":{"x":1,"y":1},"constructor":{"x":2,"y":2},"a":{"x":3,"y":3}}}}',
    );
    const preset = parseOne(raw);

    expect(Object.keys(preset.state.layout!.positions)).toEqual(["a"]);
    expect(({} as any).x).toBeUndefined();
  });
});

describe("ViewPresetsStore layout snapshots (#3456)", () => {
  let store: ViewPresetsStore;
  let mockDb: { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
  let now = 1000;
  const state: ViewPresetState = {
    activeLabels: ["lead"],
    labelFilterMode: "OR",
    activeCategories: ["faction"],
    viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
  };
  const layout = { positions: { a: { x: 1, y: 2 } } };

  beforeEach(() => {
    now = 1000;
    let n = 1;
    mockDb = { get: vi.fn(), put: vi.fn().mockResolvedValue(undefined) };
    store = new ViewPresetsStore({
      clock: { now: () => now },
      idGenerator: { uuid: () => `id-${n++}` },
      getDb: vi.fn().mockResolvedValue(mockDb) as any,
    });
  });

  it("saves a layout with a new view and writes it to storage", async () => {
    const saved = await store.savePreset("v1", "With layout", {
      ...state,
      layout,
    });

    expect(saved?.state.layout).toEqual(layout);
    const written = mockDb.put.mock.calls.at(-1)![1];
    expect(written[0].state.layout).toEqual(layout);
  });

  it("adds a layout to an existing view, changing nothing else", async () => {
    const saved = await store.savePreset("v1", "Plain", state);
    now = 2000;

    const updated = await store.setPresetLayout("v1", saved!.id, layout, {
      pan: { x: 9, y: 9 },
      zoom: 2,
    });

    expect(updated?.state.layout).toEqual(layout);
    expect(updated?.state.viewport).toEqual({ pan: { x: 9, y: 9 }, zoom: 2 });
    expect(updated?.name).toBe("Plain");
    expect(updated?.state.activeLabels).toEqual(["lead"]);
    expect(updated?.updatedAt).toBe(2000);
    expect(updated?.createdAt).toBe(1000);
  });

  it("replaces an existing layout", async () => {
    const saved = await store.savePreset("v1", "Has", { ...state, layout });

    await store.setPresetLayout("v1", saved!.id, {
      positions: { z: { x: 7, y: 7 } },
    });

    expect(store.presets[0].state.layout).toEqual({
      positions: { z: { x: 7, y: 7 } },
    });
  });

  it("removes a layout so the view is filter-only again, keeping its name and filters", async () => {
    const saved = await store.savePreset("v1", "Has", { ...state, layout });

    await store.setPresetLayout("v1", saved!.id, null);

    expect(store.presets[0].state.layout).toBeUndefined();
    expect("layout" in store.presets[0].state).toBe(false);
    expect(store.presets[0].name).toBe("Has");
    expect(store.presets[0].state.activeLabels).toEqual(["lead"]);
    expect(store.presets[0].state.viewport).toEqual(state.viewport);
  });

  it("keeps the layout through a rename and drops it with a delete", async () => {
    const saved = await store.savePreset("v1", "Has", { ...state, layout });

    await store.renamePreset("v1", saved!.id, "Renamed");
    expect(store.presets[0].state.layout).toEqual(layout);

    await store.deletePreset("v1", saved!.id);
    expect(store.presets).toHaveLength(0);
    expect(JSON.stringify(mockDb.put.mock.calls.at(-1)![1])).not.toContain(
      '"layout"',
    );
  });

  it("does nothing for a view that does not exist (negative)", async () => {
    await store.savePreset("v1", "Only", state);
    mockDb.put.mockClear();

    const result = await store.setPresetLayout("v1", "nope", layout);

    expect(result).toBeNull();
    expect(mockDb.put).not.toHaveBeenCalled();
    expect(store.presets[0].state.layout).toBeUndefined();
  });

  it("leaves the view unchanged and says so when storage fails (negative)", async () => {
    const saved = await store.savePreset("v1", "Plain", state);
    mockDb.put.mockRejectedValueOnce(new Error("quota"));

    const result = await store.setPresetLayout("v1", saved!.id, layout);

    expect(result).toBeNull();
    expect(store.presets[0].state.layout).toBeUndefined();
  });

  it("does not mutate the layout it was given", async () => {
    const input = { positions: { a: { x: 1, y: 2 } } };
    const frozen = Object.freeze({
      positions: Object.freeze({ a: Object.freeze({ x: 1, y: 2 }) }),
    });
    const saved = await store.savePreset("v1", "Plain", state);

    await store.setPresetLayout("v1", saved!.id, frozen as any);

    expect(input).toEqual({ positions: { a: { x: 1, y: 2 } } });
    expect(store.presets[0].state.layout).toEqual(frozen);
  });
});
