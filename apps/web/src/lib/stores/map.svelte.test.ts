/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/svelte";

const vaultMock = vi.hoisted(() => ({
  activeVaultId: "vault-a",
  maps: {},
  saveMaps: vi.fn(),
}));

const uiMock = vi.hoisted(() => ({
  sharedMode: false,
}));

function makeMap(id: string, isWorldMap = false) {
  return {
    id,
    name: id,
    assetPath: `${id}.png`,
    dimensions: { width: 100, height: 100 },
    pins: [],
    fogOfWar: { maskPath: `${id}.png` },
    isWorldMap,
  };
}

vi.mock("./vault.svelte", () => ({
  vault: vaultMock,
}));

vi.mock("./ui.svelte", () => ({
  uiStore: uiMock,
}));

import { MapStore } from "./map.svelte";

describe("MapStore settings persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vaultMock.activeVaultId = "vault-a";
    vaultMock.maps = {};
    uiMock.sharedMode = false;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("persists map settings for the active map", async () => {
    const store = new MapStore();
    store.selectMap("map-a");

    store.showFog = false;
    store.showGrid = true;
    store.brushRadius = 88;
    store.gridSize = 120;
    store.gridColor = "#fbbf24";

    await waitFor(() => {
      const raw = window.localStorage.getItem("codex-map-settings:map-a");
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toEqual({
        showFog: false,
        showGrid: true,
        brushRadius: 88,
        gridSize: 120,
        gridOffsetX: 0,
        gridOffsetY: 0,
        gridColor: "#fbbf24",
      });
    });
  });

  it("restores settings per map id", async () => {
    window.localStorage.setItem(
      "codex-map-settings:map-a",
      JSON.stringify({
        showFog: false,
        showGrid: true,
        brushRadius: 96,
        gridSize: 64,
        gridColor: "#3b82f6",
      }),
    );
    window.localStorage.setItem(
      "codex-map-settings:map-b",
      JSON.stringify({
        showFog: true,
        showGrid: false,
        brushRadius: 44,
        gridSize: 80,
        gridColor: null,
      }),
    );

    const store = new MapStore();

    store.selectMap("map-a");
    expect(store.showFog).toBe(false);
    expect(store.showGrid).toBe(true);
    expect(store.brushRadius).toBe(96);
    expect(store.gridSize).toBe(64);
    expect(store.gridColor).toBe("#3b82f6");

    store.selectMap("map-b");
    expect(store.showFog).toBe(true);
    expect(store.showGrid).toBe(false);
    expect(store.brushRadius).toBe(44);
    expect(store.gridSize).toBe(80);
    expect(store.gridColor).toBe(null);
  });

  it("restores the last selected map and viewport on reload", async () => {
    vaultMock.maps = {
      "map-a": makeMap("map-a", true),
      "map-b": makeMap("map-b"),
    };

    window.localStorage.setItem(
      "codex-map-page-state:vault-a",
      JSON.stringify({
        activeMapId: "map-b",
        viewports: {
          "map-a": {
            pan: { x: 12, y: 34 },
            zoom: 1.5,
          },
          "map-b": {
            pan: { x: -80, y: 25 },
            zoom: 2.25,
          },
        },
      }),
    );

    const store = new MapStore();

    await waitFor(() => {
      expect(store.activeMapId).toBe("map-b");
      expect(store.viewport).toEqual({
        pan: { x: -80, y: 25 },
        zoom: 2.25,
      });
    });

    store.selectMap("map-a");
    expect(store.activeMapId).toBe("map-a");
    expect(store.viewport).toEqual({
      pan: { x: 12, y: 34 },
      zoom: 1.5,
    });

    const stored = JSON.parse(
      window.localStorage.getItem("codex-map-page-state:vault-a")!,
    ) as {
      activeMapId: string | null;
      viewports: Record<
        string,
        { pan: { x: number; y: number }; zoom: number }
      >;
    };
    expect(stored.activeMapId).toBe("map-a");
    expect(stored.viewports["map-a"]).toEqual({
      pan: { x: 12, y: 34 },
      zoom: 1.5,
    });
    expect(stored.viewports["map-b"]).toEqual({
      pan: { x: -80, y: 25 },
      zoom: 2.25,
    });

    const reloaded = new MapStore();
    await waitFor(() => {
      expect(reloaded.activeMapId).toBe("map-a");
      expect(reloaded.viewport).toEqual({
        pan: { x: 12, y: 34 },
        zoom: 1.5,
      });
    });
  });

  it("loads remote fog masks from URL paths", async () => {
    const drawImage = vi.fn();
    const ctx = {
      clearRect: vi.fn(),
      drawImage,
    } as any;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        blob: async () => new Blob(["fog"], { type: "image/png" }),
      })) as any,
    );
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 100, height: 100 })) as any,
    );

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ctx),
        } as any;
      }
      return originalCreateElement(tag);
    });

    vaultMock.maps = {
      "map-a": {
        ...makeMap("map-a"),
        fogOfWar: { maskPath: "blob:mask-url" },
      },
    };

    const store = new MapStore();
    store.selectMap("map-a");

    const mask = await store.loadMask(100, 100);
    expect(mask).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith("blob:mask-url");
    expect(drawImage).toHaveBeenCalled();
  });
});
