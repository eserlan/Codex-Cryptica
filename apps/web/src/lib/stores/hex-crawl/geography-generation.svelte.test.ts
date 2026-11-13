import { describe, expect, it } from "vitest";
import { GEOGRAPHY_MAX_RADIUS, type HexCrawlState } from "hex-crawl-engine";
import { GeographyGenerationStore } from "./geography-generation.svelte";

function makeStore(initial: HexCrawlState) {
  let state = initial;
  const store = new GeographyGenerationStore({
    hexes: {
      revision: 0,
      stateFor: () => state,
      applyChange: async (_mapId, mutator) => {
        state = mutator(state);
        return true;
      },
    },
    settlements: () => [],
    inBounds: (_mapId, hex) => Math.abs(hex.q) <= 8 && Math.abs(hex.r) <= 8,
    newSeed: () => "seed-1",
    canEdit: () => true,
  });
  return { store, getState: () => state };
}

describe("GeographyGenerationStore", () => {
  it("sets message to empty and returns false when no hex in range has terrain", () => {
    const { store } = makeStore({ enabled: true, hexes: {} });
    expect(store.open("map-1", { q: 0, r: 0 })).toBe(false);
    expect(store.message).toBe("empty");
    expect(store.review).toBeNull();
  });

  it("clamps radius to 1..GEOGRAPHY_MAX_RADIUS and rejects non-finite values", () => {
    const { store } = makeStore({
      enabled: true,
      hexes: {
        "0,0": { terrain: { kind: "preset", id: "plains" }, updatedAt: 1 },
      },
    });
    expect(store.open("map-1", { q: 0, r: 0 })).toBe(true);
    expect(store.message).toBeNull();

    expect(store.setRadius(99)).toBe(true);
    expect(store.review?.proposal.request.radius).toBe(GEOGRAPHY_MAX_RADIUS);

    expect(store.setRadius(0)).toBe(true);
    expect(store.review?.proposal.request.radius).toBe(1);

    expect(store.setRadius(Number.NaN)).toBe(false);
    expect(store.review?.proposal.request.radius).toBe(1);
  });

  it("rejects an empty seed without clearing the active review", () => {
    const { store } = makeStore({
      enabled: true,
      hexes: {
        "0,0": { terrain: { kind: "preset", id: "plains" }, updatedAt: 1 },
      },
    });
    expect(store.open("map-1", { q: 0, r: 0 })).toBe(true);
    expect(store.setSeed("   ")).toBe(false);
    expect(store.review?.proposal.request.seed).toBe("seed-1");
  });
});
