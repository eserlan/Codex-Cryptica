import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "svelte";
import type { Map } from "schema";
vi.mock("./vault.svelte", () => ({ vault: {} }));
import { MapDisplaySettings } from "./map-display-settings.svelte";
import { DEFAULT_MAP_SETTINGS } from "./map-settings";

function setup() {
  const state = {
    ...structuredClone(DEFAULT_MAP_SETTINGS),
    hexLabelConfig: { style: "none" as const },
    activeMapId: "map" as string | null,
  };
  const storage = {
    getItem: vi.fn((key: string) => localStorage.getItem(key)),
    setItem: vi.fn((key: string, value: string) =>
      localStorage.setItem(key, value),
    ),
    removeItem: vi.fn(),
  };
  const vault = {
    maps: {} as Record<string, Map>,
    saveMaps: vi.fn().mockResolvedValue(undefined),
  };
  return {
    state,
    storage,
    vault,
    settings: new MapDisplaySettings(state, storage, vault),
  };
}

describe("MapDisplaySettings", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("restores device settings and resets them for a map with none", () => {
    const { settings, state } = setup();
    localStorage.setItem(
      "codex-map-settings:map",
      JSON.stringify({ soloFog: true, gridSize: 80, showHexCoordinates: true }),
    );
    settings.applySettings("map");
    expect(state).toMatchObject({
      soloFog: true,
      gridSize: 80,
      hexLabelConfig: { style: "numeric" },
    });
    settings.applySettings("other");
    expect(state).toMatchObject(DEFAULT_MAP_SETTINGS);
  });

  it("uses defaults if reading device storage throws", () => {
    const { settings, state, storage } = setup();
    storage.getItem.mockImplementation(() => {
      throw new Error("denied");
    });
    state.gridSize = 120;
    settings.applySettings("map");
    expect(state.gridSize).toBe(50);
    expect(settings.isRestoringSettings).toBe(false);
  });

  it("adopts device geometry once, then gives stored map geometry precedence", () => {
    const { settings, state, vault } = setup();
    vault.maps.map = {
      id: "map",
      name: "Map",
      assetPath: "",
      dimensions: { width: 100, height: 100 },
      pins: [],
    };
    localStorage.setItem(
      "codex-map-settings:map",
      JSON.stringify({ gridType: "hex-flat", gridSize: 80 }),
    );
    settings.applySettings("map");
    expect(vault.maps.map.grid).toMatchObject({ type: "hex-flat", size: 80 });
    expect(vault.saveMaps).toHaveBeenCalledOnce();
    localStorage.setItem(
      "codex-map-settings:map",
      JSON.stringify({ gridType: "square", gridSize: 10 }),
    );
    settings.applySettings("map");
    expect(state).toMatchObject({ gridType: "hex-flat", gridSize: 80 });
    expect(vault.saveMaps).toHaveBeenCalledOnce();
  });

  it("delays writing a snapshot until the debounce expires", () => {
    const { settings, state, storage } = setup();
    settings.start();
    flushSync();
    state.soloFog = true;
    vi.advanceTimersByTime(249);
    expect(storage.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(
      JSON.parse(localStorage.getItem("codex-map-settings:map")!),
    ).toMatchObject({ soloFog: true });
    expect(storage.setItem).toHaveBeenCalledOnce();
  });

  it.each(["restoring", "inactive"])("skips persistence when %s", (mode) => {
    const { settings, state, storage } = setup();
    settings.start();
    flushSync();
    if (mode === "restoring") settings.isRestoringSettings = true;
    else state.activeMapId = null;
    vi.advanceTimersByTime(250);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("continues writing grid geometry if device storage is full", async () => {
    const { settings, state, storage, vault } = setup();
    vault.maps.map = {
      id: "map",
      name: "Map",
      assetPath: "",
      dimensions: { width: 100, height: 100 },
      pins: [],
      grid: { type: "square", size: 50, offsetX: 0, offsetY: 0 },
    };
    state.gridSize = 80;
    storage.setItem.mockImplementation(() => {
      throw new Error("full");
    });
    settings.start();
    flushSync();
    await vi.advanceTimersByTimeAsync(250);
    expect(vault.maps.map.grid?.size).toBe(80);
    expect(vault.saveMaps).toHaveBeenCalledOnce();
  });
});
