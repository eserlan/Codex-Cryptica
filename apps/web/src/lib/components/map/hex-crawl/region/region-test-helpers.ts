import { vi } from "vitest";
import type { Map as MapRecord } from "schema";
import { HexCrawlStore } from "#lib/stores/hex-crawl/hex-crawl.svelte.js";
import { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";

export const MAP_ID = "11111111-1111-4111-8111-111111111111";
export const CENTRE = { q: 0, r: 0 };

export function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

export function setupRegion(saveOk = true) {
  const map = {
    id: MAP_ID,
    name: "m",
    assetPath: "m.webp",
    dimensions: { width: 800, height: 600 },
    pins: [],
  } as MapRecord;
  let tick = 1;
  const hexes = new HexCrawlStore({
    getMap: () => map,
    saveMaps: async () => saveOk,
    clock: { now: () => tick++ },
    publishCapture: vi.fn(),
    isGM: () => true,
    isGuest: () => false,
  });
  const store = new RegionGenerationStore({
    hexes,
    inBounds: () => true,
    newSeed: () => "AAAA-BBBB",
    storage: null,
    clock: { now: () => tick++ },
    canEdit: () => true,
  });
  return { store, hexes, map };
}

export const GRID = {
  orientation: "pointy",
  size: 40,
  offsetX: 0,
  offsetY: 0,
} as never;
