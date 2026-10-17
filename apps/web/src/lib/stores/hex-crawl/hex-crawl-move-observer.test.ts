import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Map as MapRecord } from "schema";
import type { Token } from "../../../types/vtt";
import { hexToPoint, type HexGridConfig } from "map-engine";
import { HexCrawlStore, type HexCrawlStoreDeps } from "./hex-crawl.svelte";
import {
  HexCrawlMoveObserver,
  type HexCrawlMoveObserverDeps,
} from "./hex-crawl-move-observer";

const MAP_ID = "22222222-2222-4222-8222-222222222222";
const NOW = 1_700_000_000_000;
const CONFIG: HexGridConfig = {
  orientation: "pointy",
  size: 40,
  offsetX: 0,
  offsetY: 0,
};

function token(id: string, q: number, r: number, isVisionSource = true): Token {
  const point = hexToPoint({ q, r }, CONFIG);
  const width = 30;
  const height = 42;
  return {
    id,
    x: point.x - width / 2,
    y: point.y - height / 2,
    width,
    height,
    isVisionSource,
  } as unknown as Token;
}

function setup(
  options: {
    store?: Partial<HexCrawlStoreDeps>;
    observer?: Partial<HexCrawlMoveObserverDeps>;
  } = {},
) {
  const map = { id: MAP_ID, name: "Overland" } as unknown as MapRecord;
  const storeDeps: HexCrawlStoreDeps = {
    getMap: (id) => (id === MAP_ID ? map : undefined),
    saveMaps: vi.fn(async () => true),
    clock: { now: () => NOW },
    publishCapture: vi.fn(),
    isGM: () => true,
    isGuest: () => false,
    ...options.store,
  };
  const store = new HexCrawlStore(storeDeps);
  const offerExplore = vi.fn();
  const observer = new HexCrawlMoveObserver({
    store,
    getActiveMapId: () => MAP_ID,
    getHexConfig: () => CONFIG,
    isHexCrawlOn: () => true,
    isGM: () => true,
    isSolo: () => false,
    offerExplore,
    ...options.observer,
  });
  return { observer, store, storeDeps, offerExplore };
}

describe("HexCrawlMoveObserver (T045, T075)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks a vision-source token's new hex explored and publishes exactly one capture", async () => {
    const { observer, store, storeDeps } = setup();

    await observer.onMoveSettled([token("party", 2, -1)]);

    expect(store.recordFor(MAP_ID, { q: 2, r: -1 })?.explored).toBe(true);
    expect(storeDeps.publishCapture).toHaveBeenCalledTimes(1);
  });

  it("publishes nothing when the token settles in an already explored hex", async () => {
    const { observer, storeDeps } = setup();
    await observer.onMoveSettled([token("party", 2, -1)]);
    vi.mocked(storeDeps.publishCapture).mockClear();

    await observer.onMoveSettled([token("party", 2, -1)]);

    expect(storeDeps.publishCapture).not.toHaveBeenCalled();
  });

  it("only the end hex of a move counts", async () => {
    const { observer, store } = setup();

    // The token's settled position is its end; the hexes it passed through
    // are never passed in, so only the destination becomes explored.
    await observer.onMoveSettled([token("party", 4, 0)]);

    expect(store.recordFor(MAP_ID, { q: 4, r: 0 })?.explored).toBe(true);
    expect(store.recordFor(MAP_ID, { q: 3, r: 0 })).toBeUndefined();
    expect(store.recordFor(MAP_ID, { q: 2, r: 0 })).toBeUndefined();
  });

  it("ignores tokens that are not vision sources", async () => {
    const { observer, store, storeDeps } = setup();

    await observer.onMoveSettled([token("npc", 1, 1, false)]);

    expect(store.recordFor(MAP_ID, { q: 1, r: 1 })).toBeUndefined();
    expect(storeDeps.publishCapture).not.toHaveBeenCalled();
  });

  it.each([
    ["mode off", { isHexCrawlOn: () => false }],
    ["a non-hex grid", { getHexConfig: () => null }],
    ["a non-GM client", { isGM: () => false }],
    ["no active map", { getActiveMapId: () => null }],
  ])("does nothing with %s", async (_label, override) => {
    const { observer, store, storeDeps, offerExplore } = setup({
      observer: override as Partial<HexCrawlMoveObserverDeps>,
    });

    await observer.onMoveSettled([token("party", 3, 3)]);

    expect(store.recordFor(MAP_ID, { q: 3, r: 3 })).toBeUndefined();
    expect(storeDeps.publishCapture).not.toHaveBeenCalled();
    expect(offerExplore).not.toHaveBeenCalled();
  });

  it("does nothing in a guest vault, even as the GM", async () => {
    const { observer, store, storeDeps, offerExplore } = setup({
      store: { isGuest: () => true },
      observer: { isSolo: () => true },
    });

    await observer.onMoveSettled([token("party", 3, 3)]);

    expect(store.recordFor(MAP_ID, { q: 3, r: 3 })).toBeUndefined();
    expect(storeDeps.publishCapture).not.toHaveBeenCalled();
    expect(offerExplore).not.toHaveBeenCalled();
  });

  it("offers Explore once for a newly explored hex in solo play (T075)", async () => {
    const { observer, offerExplore } = setup({
      observer: { isSolo: () => true },
    });

    await observer.onMoveSettled([token("party", 1, 2)]);

    expect(offerExplore).toHaveBeenCalledTimes(1);
    expect(offerExplore).toHaveBeenCalledWith(MAP_ID, { q: 1, r: 2 });
  });

  it("does not offer Explore for a hex that was already explored", async () => {
    const { observer, offerExplore } = setup({
      observer: { isSolo: () => true },
    });
    await observer.onMoveSettled([token("party", 1, 2)]);
    offerExplore.mockClear();

    await observer.onMoveSettled([token("party", 1, 2)]);

    expect(offerExplore).not.toHaveBeenCalled();
  });

  it("does not offer Explore when solo play is off, but still marks the hex", async () => {
    const { observer, store, offerExplore } = setup({
      observer: { isSolo: () => false },
    });

    await observer.onMoveSettled([token("party", 5, 5)]);

    expect(store.recordFor(MAP_ID, { q: 5, r: 5 })?.explored).toBe(true);
    expect(offerExplore).not.toHaveBeenCalled();
  });

  it("never starts discovery itself (FR-036)", async () => {
    const { observer, store, offerExplore } = setup({
      observer: { isSolo: () => true },
    });
    const setDraft = vi.spyOn(store, "setDraft");

    await observer.onMoveSettled([token("party", 0, 4)]);

    expect(setDraft).not.toHaveBeenCalled();
    expect(offerExplore).toHaveBeenCalledTimes(1);
    expect(store.recordFor(MAP_ID, { q: 0, r: 4 })?.draft).toBeUndefined();
  });
});
