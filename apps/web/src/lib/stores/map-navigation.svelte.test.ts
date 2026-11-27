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
  const timers = createTimerScheduler();
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
    timers,
  );
  return { state, settings, vault, storage, timers, navigation };
}

function createTimerScheduler() {
  let now = 0;
  let nextId = 0;
  const scheduled = new Map<
    ReturnType<typeof setTimeout>,
    { dueAt: number; callback: () => void }
  >();
  const scheduleTimeout = vi.fn((callback: () => void, delay: number) => {
    const id = ++nextId as unknown as ReturnType<typeof setTimeout>;
    scheduled.set(id, { dueAt: now + delay, callback });
    return id;
  });
  const cancelTimeout = vi.fn((id: ReturnType<typeof setTimeout>) => {
    scheduled.delete(id);
  });

  function advanceBy(ms: number) {
    now += ms;
    while (true) {
      const next = [...scheduled.entries()].sort(
        ([, left], [, right]) => left.dueAt - right.dueAt,
      )[0];
      if (!next || next[1].dueAt > now) return;
      scheduled.delete(next[0]);
      next[1].callback();
    }
  }

  return { scheduleTimeout, cancelTimeout, advanceBy };
}

describe("MapNavigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
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
    const { navigation, storage, timers } = setup();
    navigation.selectMap("first");
    storage.setItem.mockClear();
    navigation.updateViewport({ x: 1, y: 2 }, 2);
    timers.advanceBy(200);
    navigation.updateViewport({ x: 3, y: 4 }, 3);
    expect(timers.cancelTimeout).toHaveBeenCalledOnce();
    timers.advanceBy(249);
    expect(storage.setItem).not.toHaveBeenCalled();
    timers.advanceBy(1);
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
    const { navigation, state, vault, timers } = setup();
    navigation.selectMap("first");
    navigation.updateViewport({ x: 5, y: 6 }, 2);
    timers.advanceBy(250);
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
    const { navigation, settings, storage, timers } = setup();
    settings.isRestoringSettings = true;
    navigation.updateViewport({ x: 5, y: 6 }, 2);
    timers.advanceBy(250);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
