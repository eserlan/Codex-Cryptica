import { describe, expect, it, vi } from "vitest";
import type { Map as MapRecord } from "schema";
import { HexCrawlStore } from "./hex-crawl.svelte";
import {
  REGION_STORAGE_PREFIX,
  RegionGenerationStore,
} from "./region-generation.svelte";

const MAP_ID = "11111111-1111-4111-8111-111111111111";
const CENTRE = { q: 0, r: 0 };

function setup(
  opts: { saveOk?: boolean; canEdit?: boolean; seeds?: string[] } = {},
) {
  const map = {
    id: MAP_ID,
    name: "Overland",
    assetPath: "m.webp",
    dimensions: { width: 800, height: 600 },
    pins: [],
  } as MapRecord;
  let now = 1000;
  const saveMaps = vi.fn(async () => opts.saveOk ?? true);
  const hexes = new HexCrawlStore({
    getMap: () => map,
    saveMaps,
    clock: { now: () => now++ },
    publishCapture: vi.fn(),
    isGM: () => true,
    isGuest: () => false,
  });
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  const seeds = [...(opts.seeds ?? ["AAAA-BBBB", "CCCC-DDDD", "EEEE-FFFF"])];
  const store = new RegionGenerationStore({
    hexes,
    inBounds: () => true,
    newSeed: () => seeds.shift() ?? "ZZZZ-ZZZZ",
    storage,
    clock: { now: () => now++ },
    canEdit: () => opts.canEdit ?? true,
  });
  return { store, hexes, map, saveMaps, data };
}

describe("RegionGenerationStore", () => {
  it("previews without touching the map, and cancel leaves nothing behind", () => {
    const { store, map, saveMaps } = setup();
    expect(store.open(MAP_ID, "area", CENTRE, 2)).toBe(true);
    expect(store.review?.proposal.hexes).toBeDefined();
    expect(Object.keys(store.review!.proposal.hexes)).toHaveLength(19);
    store.cancel();
    expect(store.review).toBeNull();
    expect(map.hexCrawl).toBeUndefined();
    expect(saveMaps).not.toHaveBeenCalled();
  });

  it("refuses for a viewer who cannot edit", () => {
    const { store } = setup({ canEdit: false });
    expect(store.open(MAP_ID, "area", CENTRE, 2)).toBe(false);
    expect(store.review).toBeNull();
  });

  it("says there is nothing to generate when there are no empty hexes to fill", () => {
    const { store } = setup();
    expect(store.open(MAP_ID, "gaps", CENTRE, 2)).toBe(false);
    expect(store.message).toEqual({
      kind: "refused",
      reason: "nothing-to-generate",
    });
  });

  it("accepts in one save, writes provenance, and offers undo", async () => {
    const { store, hexes, saveMaps } = setup();
    store.open(MAP_ID, "area", CENTRE, 1);
    expect(await store.accept()).toBe(true);
    expect(saveMaps).toHaveBeenCalledTimes(1);
    const record = hexes.recordFor(MAP_ID, CENTRE);
    expect(record?.generated?.seed).toBe("AAAA-BBBB");
    expect(store.review).toBeNull();
    expect(store.message).toMatchObject({ kind: "saved", applied: 7 });
    expect(store.undoAvailable).toBe(true);

    expect(await store.undo()).toBe(true);
    expect(hexes.recordFor(MAP_ID, CENTRE)).toBeUndefined();
    expect(store.undoAvailable).toBe(false);
  });

  it("keeps the preview and writes nothing when the save fails", async () => {
    const { store, map } = setup({ saveOk: false });
    store.open(MAP_ID, "area", CENTRE, 1);
    expect(await store.accept()).toBe(false);
    expect(store.message).toEqual({ kind: "failed" });
    expect(store.review).not.toBeNull();
    expect(map.hexCrawl?.hexes ?? {}).toEqual({});
  });

  it("applies a hand adjustment as manual terrain without provenance", async () => {
    const { store, hexes } = setup();
    store.open(MAP_ID, "area", CENTRE, 1);
    store.adjust("0,0", { kind: "preset", id: "desert" });
    await store.accept();
    const record = hexes.recordFor(MAP_ID, CENTRE);
    expect(record?.terrain).toEqual({ kind: "preset", id: "desert" });
    expect(record?.generated).toBeUndefined();
  });

  it("ignores adjustments outside the proposal and can clear one", () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 1);
    store.adjust("9,9", { kind: "preset", id: "desert" });
    expect(store.review?.adjustments).toEqual({});
    store.adjust("0,0", { kind: "preset", id: "desert" });
    store.adjust("0,0", null);
    expect(store.review?.adjustments).toEqual({});
  });

  it("rerolls to a new seed, and keeps the same result for the same seed", () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 3);
    const first = { ...store.review!.proposal.hexes };
    store.reroll();
    expect(store.review?.seed).toBe("CCCC-DDDD");
    store.setSeed("aaaa-bbbb");
    expect(store.review?.proposal.hexes).toEqual(first);
  });

  it("rejects an empty seed and keeps the preview", () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 2);
    expect(store.setSeed("   ")).toBe(false);
    expect(store.review?.seed).toBe("AAAA-BBBB");
  });

  it("remembers seed and settings per map, and uses the settings next time", () => {
    const { store, data } = setup();
    store.open(MAP_ID, "area", CENTRE, 2);
    store.setPreset("arid");
    store.setLevel("forest", "less");
    expect(data.has(`${REGION_STORAGE_PREFIX}${MAP_ID}`)).toBe(true);
    store.cancel();
    store.open(MAP_ID, "area", CENTRE, 2);
    expect(store.review?.settings.preset).toBe("arid");
    expect(store.review?.settings.levels.forest).toBe("less");
    store.setLevel("forest", "normal");
    expect(store.review?.settings.levels.forest).toBeUndefined();
  });

  it("ignores corrupt remembered data", () => {
    const { store, data } = setup();
    data.set(`${REGION_STORAGE_PREFIX}${MAP_ID}`, "{nope");
    expect(store.remembered(MAP_ID)).toBeNull();
    expect(store.open(MAP_ID, "area", CENTRE, 1)).toBe(true);
  });

  it("blocks undo once something else has been saved", async () => {
    const { store, hexes } = setup();
    store.open(MAP_ID, "area", CENTRE, 1);
    await store.accept();
    await hexes.setNotes(MAP_ID, { q: 5, r: 5 }, "later");
    expect(store.undoAvailable).toBe(false);
    expect(await store.undo()).toBe(false);
  });

  it("leave drops the preview and the undo", async () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 1);
    await store.accept();
    store.leave();
    expect(store.undoAvailable).toBe(false);
    expect(store.message).toBeNull();
  });
});
