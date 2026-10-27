import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "svelte";
import type { Map } from "schema";
vi.mock("./vault.svelte", () => ({ vault: {} }));
import { MapNavigation } from "./map-navigation.svelte";

const makeMap = (id: string): Map => ({
  id,
  name: id,
  assetPath: "",
  dimensions: { width: 10, height: 10 },
  pins: [],
});
function setup(canSelectFirst = true) {
  const state = {
    activeMapId: null as string | null,
    viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
    navigationStack: [] as string[],
    worldMap: null as Map | null,
  };
  const settings = { applySettings: vi.fn(), isRestoringSettings: false };
  const vault = { maps: {} as Record<string, Map>, activeVaultId: "vault-a" };
  const storage = {
    getItem: vi.fn((key: string) => localStorage.getItem(key)),
    setItem: vi.fn((key: string, value: string) =>
      localStorage.setItem(key, value),
    ),
    removeItem: vi.fn(),
  };
  const navigation = new MapNavigation(
    state,
    settings,
    storage,
    vault,
    () => canSelectFirst,
  );
  return { state, settings, vault, storage, navigation };
}

describe("MapNavigation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("restores the previous viewport and settings through back navigation", () => {
    const { navigation, state, settings } = setup();
    navigation.selectMap("first");
    navigation.updateViewport({ x: 12, y: -8 }, 2);
    navigation.selectMap("second", true);
    expect(state.navigationStack).toEqual(["first"]);
    expect(state.viewport).toEqual({ pan: { x: 0, y: 0 }, zoom: 1 });
    navigation.goBack();
    expect(state.activeMapId).toBe("first");
    expect(state.viewport).toEqual({ pan: { x: 12, y: -8 }, zoom: 2 });
    expect(settings.applySettings).toHaveBeenLastCalledWith("first");
    expect(state.navigationStack).toEqual([]);
  });

  it("does nothing when selecting the current map or going back without history", () => {
    const { navigation, storage, settings } = setup();
    navigation.selectMap("first");
    storage.setItem.mockClear();
    settings.applySettings.mockClear();
    navigation.selectMap("first", true);
    navigation.goBack();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(settings.applySettings).not.toHaveBeenCalled();
  });

  it("coalesces viewport updates after 250ms of inactivity", () => {
    const { navigation, storage } = setup();
    navigation.selectMap("first");
    storage.setItem.mockClear();
    navigation.updateViewport({ x: 1, y: 2 }, 2);
    vi.advanceTimersByTime(200);
    navigation.updateViewport({ x: 3, y: 4 }, 3);
    vi.advanceTimersByTime(249);
    expect(storage.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(
      JSON.parse(localStorage.getItem("codex-map-page-state:vault-a")!)
        .viewports.first,
    ).toEqual({ pan: { x: 3, y: 4 }, zoom: 3 });
  });

  it("ignores malformed viewports while restoring a pending selection", () => {
    const { navigation, state, settings, vault } = setup();
    localStorage.setItem(
      "codex-map-page-state:vault-a",
      JSON.stringify({
        activeMapId: "saved",
        viewports: {
          saved: { pan: { x: 5, y: -2 }, zoom: 2 },
          invalid: { pan: { x: "bad", y: 0 }, zoom: 1 },
          missing: null,
        },
      }),
    );
    vault.maps.saved = makeMap("saved");
    navigation.restorePageState();
    expect(state.activeMapId).toBeNull();
    expect(state.viewport.zoom).toBe(2);
    navigation.start();
    flushSync();
    expect(state.activeMapId).toBe("saved");
    expect(settings.applySettings).toHaveBeenLastCalledWith("saved");
    expect(
      JSON.parse(localStorage.getItem("codex-map-page-state:vault-a")!)
        .viewports,
    ).toEqual({ saved: { pan: { x: 5, y: -2 }, zoom: 2 } });
  });

  it("waits for a pending map instead of selecting an available fallback", () => {
    const { navigation, state, vault } = setup();
    localStorage.setItem(
      "codex-map-page-state:vault-a",
      JSON.stringify({ activeMapId: "pending" }),
    );
    vault.maps.first = makeMap("first");
    navigation.restorePageState();
    navigation.start();
    flushSync();
    expect(state.activeMapId).toBeNull();
  });

  it.each([true, false])(
    "gates fallback selection for guests (%s)",
    (canSelectFirst) => {
      const { navigation, state, vault } = setup(canSelectFirst);
      vault.maps.first = makeMap("first");
      navigation.start();
      flushSync();
      expect(state.activeMapId).toBe(canSelectFirst ? "first" : null);
    },
  );

  it("replaces a missing active map once map records have loaded", () => {
    const { navigation, state, vault } = setup();
    state.activeMapId = "missing";
    vault.maps.first = makeMap("first");
    navigation.start();
    flushSync();
    expect(state.activeMapId).toBe("first");
  });

  it("keeps an active selection while map records are still empty", () => {
    const { navigation, state } = setup();
    state.activeMapId = "loading";
    navigation.start();
    flushSync();
    expect(state.activeMapId).toBe("loading");
  });

  it("prefers the world map even when guest fallback is disabled", () => {
    const { navigation, state, vault } = setup(false);
    vault.maps.first = makeMap("first");
    vault.maps.world = makeMap("world");
    state.worldMap = vault.maps.world;
    navigation.start();
    flushSync();
    expect(state.activeMapId).toBe("world");
  });

  it("restores each vault's page state and clears the history on vault switch", () => {
    const { navigation, state, vault } = setup();
    navigation.selectMap("first");
    navigation.updateViewport({ x: 5, y: 6 }, 2);
    vi.advanceTimersByTime(250);
    navigation.selectMap("second", true);
    navigation.start();
    flushSync();
    vault.activeVaultId = "vault-b";
    window.dispatchEvent(new Event("vault-switched"));
    expect(state.activeMapId).toBeNull();
    expect(state.navigationStack).toEqual([]);
    expect(state.viewport.zoom).toBe(1);
    navigation.selectMap("third");
    expect(
      JSON.parse(localStorage.getItem("codex-map-page-state:vault-b")!)
        .activeMapId,
    ).toBe("third");
  });

  it("continues selecting maps if storage fails", () => {
    const { navigation, state, storage } = setup();
    storage.getItem.mockImplementation(() => {
      throw new Error("denied");
    });
    storage.setItem.mockImplementation(() => {
      throw new Error("full");
    });
    navigation.restorePageState();
    navigation.selectMap("first");
    expect(state.activeMapId).toBe("first");
    expect(state.viewport).toEqual({ pan: { x: 0, y: 0 }, zoom: 1 });
  });

  it("does not persist a viewport during settings restoration", () => {
    const { navigation, settings, storage } = setup();
    settings.isRestoringSettings = true;
    navigation.updateViewport({ x: 5, y: 6 }, 2);
    vi.advanceTimersByTime(250);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
