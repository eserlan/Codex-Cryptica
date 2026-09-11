/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { guestVault } from "$lib/stores/guest-vault.svelte";

const vaultMock = vi.hoisted(() => ({
  activeVaultId: "vault-a",
  maps: {},
  saveMaps: vi.fn(),
  getActiveVaultHandle: vi.fn(),
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

import { MapStore } from "./map.svelte";

describe("MapStore settings persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vaultMock.activeVaultId = "vault-a";
    vaultMock.maps = {};
    sessionModeStore.sharedMode = false;
    sessionModeStore.isGuestMode = false;
    guestVault.publishId = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionModeStore.isGuestMode = false;
    guestVault.publishId = null;
  });

  it("falls back to the first map for a published-vault reader with no world map", async () => {
    vaultMock.maps = {
      "map-a": makeMap("map-a"),
      "map-b": makeMap("map-b"),
    };
    sessionModeStore.isGuestMode = true;
    guestVault.publishId = "pub-1";

    const store = new MapStore();

    await waitFor(() => {
      expect(store.activeMapId).toBe("map-a");
    });
  });

  it("falls back to the first available map for host when no world map is designated", async () => {
    vaultMock.maps = {
      "map-a": makeMap("map-a"),
      "map-b": makeMap("map-b"),
    };
    sessionModeStore.isGuestMode = false;
    guestVault.publishId = null;

    const store = new MapStore();

    await waitFor(() => {
      expect(store.activeMapId).toBe("map-a");
    });
  });

  it("does not auto-select a map for a live VTT guest without a publishId", async () => {
    vaultMock.maps = {
      "map-a": makeMap("map-a"),
    };
    sessionModeStore.isGuestMode = true;
    guestVault.publishId = null;

    const store = new MapStore();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.activeMapId).toBeNull();
  });

  it("persists map settings for the active map", async () => {
    const store = new MapStore();
    store.selectMap("map-a");

    store.showFog = false;
    store.showGrid = true;
    store.brushRadius = 88;
    store.gridSize = 120;
    store.gridOffsetX = 12;
    store.gridOffsetY = -8;
    store.gridColor = "#fbbf24";
    store.showLabels = true;

    await waitFor(() => {
      const raw = window.localStorage.getItem("codex-map-settings:map-a");
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toEqual({
        showFog: false,
        showGrid: true,
        brushRadius: 88,
        gridSize: 120,
        gridOffsetX: 12,
        gridOffsetY: -8,
        gridColor: "#fbbf24",
        showLabels: true,
        visionMode: "party",
        visionRange: 60,
        layerVisibility: { terrain: true, object: true, token: true },
        layerLocked: { terrain: false, object: false, token: false },
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
        showLabels: true,
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
        showLabels: false,
      }),
    );

    const store = new MapStore();

    store.selectMap("map-a");
    expect(store.showFog).toBe(false);
    expect(store.showGrid).toBe(true);
    expect(store.brushRadius).toBe(96);
    expect(store.gridSize).toBe(64);
    expect(store.gridColor).toBe("#3b82f6");
    expect(store.showLabels).toBe(true);
    // Blobs saved before layers existed have neither key — falls back to
    // "everything visible, nothing locked" rather than undefined.
    expect(store.layerVisibility).toEqual({
      terrain: true,
      object: true,
      token: true,
    });
    expect(store.layerLocked).toEqual({
      terrain: false,
      object: false,
      token: false,
    });

    store.selectMap("map-b");
    expect(store.showFog).toBe(true);
    expect(store.showGrid).toBe(false);
    expect(store.brushRadius).toBe(44);
    expect(store.gridSize).toBe(80);
    expect(store.gridColor).toBe(null);
    expect(store.showLabels).toBe(false);
  });

  it("persists a layer visibility/lock toggle and restores it later", async () => {
    const store = new MapStore();
    store.selectMap("map-a");

    store.layerVisibility.terrain = false;
    store.layerLocked.object = true;

    await waitFor(() => {
      const raw = window.localStorage.getItem("codex-map-settings:map-a");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.layerVisibility).toEqual({
        terrain: false,
        object: true,
        token: true,
      });
      expect(parsed.layerLocked).toEqual({
        terrain: false,
        object: true,
        token: false,
      });
    });

    const restored = new MapStore();
    restored.selectMap("map-a");
    expect(restored.layerVisibility.terrain).toBe(false);
    expect(restored.layerLocked.object).toBe(true);
  });

  it("merges a persisted blob missing a since-added layer over the defaults", async () => {
    window.localStorage.setItem(
      "codex-map-settings:map-a",
      JSON.stringify({
        showFog: false,
        showGrid: false,
        layerVisibility: { terrain: false },
      }),
    );

    const store = new MapStore();
    store.selectMap("map-a");

    expect(store.layerVisibility).toEqual({
      terrain: false,
      object: true,
      token: true,
    });
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

  it("debounces viewport persistence so rapid drag updates don't do synchronous storage I/O per frame", async () => {
    vi.useFakeTimers();
    try {
      vaultMock.maps = { "map-a": makeMap("map-a", true) };
      const store = new MapStore();
      await vi.waitFor(() => expect(store.activeMapId).toBe("map-a"));

      // Simulate several pointermove updates in a fast drag.
      store.updateViewport({ x: 1, y: 1 }, 1);
      store.updateViewport({ x: 5, y: 5 }, 1);
      store.updateViewport({ x: 12, y: 12 }, 1);

      // None of those should have hit storage synchronously yet.
      const midDrag = window.localStorage.getItem(
        "codex-map-page-state:vault-a",
      );
      const midDragViewport = midDrag
        ? JSON.parse(midDrag).viewports?.["map-a"]
        : undefined;
      expect(midDragViewport).not.toEqual({ pan: { x: 12, y: 12 }, zoom: 1 });

      await vi.advanceTimersByTimeAsync(250);

      const settled = JSON.parse(
        window.localStorage.getItem("codex-map-page-state:vault-a")!,
      );
      expect(settled.viewports["map-a"]).toEqual({
        pan: { x: 12, y: 12 },
        zoom: 1,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses an injected storage instead of window.localStorage", async () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    const store = new MapStore(storage);
    store.selectMap("map-x");
    store.brushRadius = 77;

    await waitFor(() => {
      const raw = mem.get("codex-map-settings:map-x");
      expect(raw).not.toBeUndefined();
      expect(JSON.parse(raw!).brushRadius).toBe(77);
    });
    // Nothing leaked to the real localStorage.
    expect(window.localStorage.getItem("codex-map-settings:map-x")).toBeNull();
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

describe("MapStore.createBlankMap", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vaultMock.activeVaultId = "vault-a";
    vaultMock.maps = {};
    vaultMock.getActiveVaultHandle.mockReset();
  });

  it("creates a map with no background image at the fixed blank-map size", async () => {
    vaultMock.getActiveVaultHandle.mockResolvedValue({ name: "vault-a" });
    const store = new MapStore(undefined, { uuid: () => "blank-map-id" });

    const id = await store.createBlankMap("New Map");

    expect(id).toBe("blank-map-id");
    expect(
      (vaultMock.maps as Record<string, unknown>)["blank-map-id"],
    ).toMatchObject({
      name: "New Map",
      assetPath: "",
      dimensions: { width: 4000, height: 4000 },
      fogOfWar: { maskPath: "maps/blank-map-id_mask.png" },
    });
    expect(vaultMock.saveMaps).toHaveBeenCalled();
    expect(store.activeMapId).toBe("blank-map-id");
  });

  it("fails gracefully with no active vault", async () => {
    vaultMock.getActiveVaultHandle.mockResolvedValue(undefined);
    const store = new MapStore(undefined, { uuid: () => "blank-map-id" });

    const id = await store.createBlankMap("New Map");

    expect(id).toBeUndefined();
    expect(
      (vaultMock.maps as Record<string, unknown>)["blank-map-id"],
    ).toBeUndefined();
  });
});
