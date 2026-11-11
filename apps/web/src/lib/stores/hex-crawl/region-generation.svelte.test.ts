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

  it("remembers seed and settings on accept, and reuses both next time", async () => {
    const { store, data } = setup({ seeds: ["AAAA-BBBB", "SECOND-ONE"] });
    store.open(MAP_ID, "area", CENTRE, 1);
    store.setPreset("arid");
    store.setLevel("forest", "less");
    expect(data.has(`${REGION_STORAGE_PREFIX}${MAP_ID}`)).toBe(false);
    await store.accept();
    expect(data.has(`${REGION_STORAGE_PREFIX}${MAP_ID}`)).toBe(true);
    store.open(MAP_ID, "area", { q: 5, r: 0 }, 1);
    expect(store.review?.seed).toBe("AAAA-BBBB");
    expect(store.review?.settings.preset).toBe("arid");
    expect(store.review?.settings.levels.forest).toBe("less");
    store.setLevel("forest", "normal");
    expect(store.review?.settings.levels.forest).toBeUndefined();
  });

  it("does not remember anything when the review is cancelled or the save fails", async () => {
    const cancelled = setup();
    cancelled.store.open(MAP_ID, "area", CENTRE, 1);
    cancelled.store.cancel();
    expect(cancelled.data.size).toBe(0);
    const failed = setup({ saveOk: false });
    failed.store.open(MAP_ID, "area", CENTRE, 1);
    await failed.store.accept();
    expect(failed.data.size).toBe(0);
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

  it("keeps hand changes across a radius, landscape or amount change, and drops them on a new seed", () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 2);
    store.adjust("0,0", { kind: "preset", id: "desert" });
    store.setRadius(3);
    expect(store.review?.adjustments["0,0"]).toBeDefined();
    store.setPreset("arid");
    store.setLevel("forest", "less");
    expect(store.review?.adjustments["0,0"]).toBeDefined();
    store.setRadius(1);
    store.setRadius(2);
    expect(store.review?.adjustments["0,0"]).toBeDefined();
    store.reroll();
    expect(store.review?.adjustments).toEqual({});
  });

  it("drops a hand change for a hex that is no longer in the proposal", () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 3);
    store.adjust("3,0", { kind: "preset", id: "desert" });
    store.setRadius(1);
    expect(store.review?.adjustments).toEqual({});
  });

  it("keeps the old preview and reports why when a change leaves nothing to propose", () => {
    const { store } = setup();
    store.open(MAP_ID, "area", CENTRE, 2);
    for (const id of [
      "plains",
      "forest",
      "hills",
      "mountains",
      "swamp",
      "desert",
      "water",
      "coast",
      "tundra",
    ] as const) {
      store.setLevel(id, "none");
    }
    expect(store.review).not.toBeNull();
    expect(store.message).toEqual({
      kind: "refused",
      reason: "no-terrain-available",
    });
    // The last change would leave nothing, so it was not applied.
    expect(store.review?.settings.levels.tundra).toBeUndefined();
    expect(store.review?.seed).toBe("AAAA-BBBB");
  });

  it("ignores edits while a save is in flight", async () => {
    const { store, hexes } = setup();
    store.open(MAP_ID, "area", CENTRE, 1);
    const original = hexes.applyChange.bind(hexes);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    hexes.applyChange = async (id, change) => {
      await gate;
      return original(id, change);
    };
    const saving = store.accept();
    expect(store.busy).toBe(true);
    expect(store.reroll()).toBe(false);
    expect(store.setRadius(3)).toBe(false);
    store.adjust("0,0", { kind: "preset", id: "desert" });
    expect(store.review?.adjustments).toEqual({});
    expect(store.open(MAP_ID, "area", CENTRE, 2)).toBe(false);
    release();
    await saving;
    expect(store.busy).toBe(false);
  });

  it("does not report a result for a save that finished after leaving the map", async () => {
    const { store, hexes } = setup();
    store.open(MAP_ID, "area", CENTRE, 1);
    const original = hexes.applyChange.bind(hexes);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    hexes.applyChange = async (id, change) => {
      await gate;
      return original(id, change);
    };
    const saving = store.accept();
    store.leave();
    release();
    await saving;
    expect(store.message).toBeNull();
    expect(store.undoAvailable).toBe(false);
    expect(store.mapId).toBeNull();
  });

  it("reports a failed undo and keeps the record usable", async () => {
    const ctx = setup();
    ctx.store.open(MAP_ID, "area", CENTRE, 1);
    await ctx.store.accept();
    const original = ctx.hexes.applyChange.bind(ctx.hexes);
    ctx.hexes.applyChange = async () => {
      throw new Error("disk full");
    };
    expect(await ctx.store.undo()).toBe(false);
    expect(ctx.store.message).toEqual({ kind: "failed" });
    ctx.hexes.applyChange = original;
    expect(await ctx.store.undo()).toBe(true);
  });

  it("does not report an undo that finished after leaving the map", async () => {
    const ctx = setup();
    ctx.store.open(MAP_ID, "area", CENTRE, 1);
    await ctx.store.accept();
    const original = ctx.hexes.applyChange.bind(ctx.hexes);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    ctx.hexes.applyChange = async (id, change) => {
      await gate;
      return original(id, change);
    };
    const undoing = ctx.store.undo();
    ctx.store.leave();
    release();
    await undoing;
    expect(ctx.store.message).toBeNull();
  });
});
