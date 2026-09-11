import { describe, it, expect, vi } from "vitest";
import {
  VTTGridManager,
  type VTTGridManagerDependencies,
} from "./vtt-grid-manager.svelte";
import type { StorageLike } from "$lib/utils/runtime-deps";

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function deps(storage: StorageLike): VTTGridManagerDependencies {
  return {
    mapStore: {} as any,
    getMapId: () => "m1",
    emit: vi.fn(),
    persistDraft: vi.fn(),
    storage,
  };
}

describe("VTTGridManager (injected storage)", () => {
  it("persists grid measure through the injected storage", () => {
    const storage = memoryStorage();
    const mgr = new VTTGridManager(deps(storage));
    mgr.gridUnit = "m";
    mgr.gridDistance = 2;

    mgr.saveGridMeasure("m1");

    const raw = storage.getItem("codex.vtt.grid-measure:m1");
    expect(JSON.parse(raw!)).toEqual({ gridUnit: "m", gridDistance: 2 });
  });

  it("loads grid measure from the injected storage", () => {
    const storage = memoryStorage({
      "codex.vtt.grid-measure:m1": JSON.stringify({
        gridUnit: "km",
        gridDistance: 9,
      }),
    });
    const mgr = new VTTGridManager(deps(storage));

    mgr.loadGridMeasure("m1");

    expect(mgr.gridUnit).toBe("km");
    expect(mgr.gridDistance).toBe(9);
  });

  it("ignores corrupt stored entries", () => {
    const storage = memoryStorage({
      "codex.vtt.grid-measure:m1": "not json{",
    });
    const mgr = new VTTGridManager(deps(storage));
    expect(() => mgr.loadGridMeasure("m1")).not.toThrow();
    expect(mgr.gridUnit).toBe("ft"); // unchanged default
  });
});

describe("VTTGridManager gridMoveMode / gridFixedPan", () => {
  function depsWithPan(pan: { x: number; y: number }) {
    return {
      mapStore: { viewport: { pan, zoom: 1 } } as any,
      getMapId: () => "m1",
      emit: vi.fn(),
      persistDraft: vi.fn(),
      storage: memoryStorage(),
    };
  }

  it("snapshots the current pan when move mode is enabled", () => {
    const mgr = new VTTGridManager(depsWithPan({ x: 42, y: -13 }));

    mgr.gridMoveMode = true;

    expect(mgr.gridMoveMode).toBe(true);
    expect(mgr.gridFixedPan).toEqual({ x: 42, y: -13 });
  });

  it("clears the pan snapshot when move mode is disabled", () => {
    const mgr = new VTTGridManager(depsWithPan({ x: 42, y: -13 }));
    mgr.gridMoveMode = true;

    mgr.gridMoveMode = false;

    expect(mgr.gridFixedPan).toBeNull();
  });

  it("re-snapshots pan on re-entry rather than reusing the old value", () => {
    const pan = { x: 10, y: 10 };
    const mgr = new VTTGridManager(depsWithPan(pan));
    mgr.gridMoveMode = true;
    mgr.gridMoveMode = false;

    pan.x = 99;
    pan.y = 99;
    mgr.gridMoveMode = true;

    expect(mgr.gridFixedPan).toEqual({ x: 99, y: 99 });
  });
});
