import { describe, expect, it } from "vitest";
import {
  GEOGRAPHY_MAX_RADIUS,
  hexEdgeFeatureKey,
  type HexCrawlState,
} from "hex-crawl-engine";
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

  it("tracks rejection independently for features sharing an edge", () => {
    const { store } = makeStore({
      enabled: true,
      hexes: {
        "0,0": { terrain: { kind: "preset", id: "plains" }, updatedAt: 1 },
      },
    });
    expect(store.open("map-1", { q: 0, r: 0 })).toBe(true);
    const edge = "0,0|1,0";
    store.review!.proposal.edges = {
      [edge]: {
        river: {
          from: "0,0",
          to: "1,0",
          provenance: { source: "generated" },
        },
        road: { kind: "road", provenance: { source: "generated" } },
      },
    };

    store.toggleEdge(edge, "road");
    expect(store.review!.disabledEdgeFeatures).toEqual(
      new Set([hexEdgeFeatureKey(edge, "road")]),
    );
    store.toggleEdge(edge, "road");
    expect(store.review!.disabledEdgeFeatures.size).toBe(0);
  });

  it("ignores cancel while an accept save is in flight", async () => {
    let resolveSave!: (value: boolean) => void;
    let state: HexCrawlState = {
      enabled: true,
      hexes: {
        "0,0": { terrain: { kind: "preset", id: "plains" }, updatedAt: 1 },
        "1,0": { terrain: { kind: "preset", id: "water" }, updatedAt: 1 },
      },
    };
    const store = new GeographyGenerationStore({
      hexes: {
        revision: 0,
        stateFor: () => state,
        applyChange: async (_mapId, mutator) => {
          state = mutator(state);
          return new Promise<boolean>((resolve) => {
            resolveSave = resolve;
          });
        },
      },
      settlements: () => [],
      inBounds: (_mapId, hex) => Math.abs(hex.q) <= 8 && Math.abs(hex.r) <= 8,
      newSeed: () => "seed-1",
      canEdit: () => true,
    });
    expect(store.open("map-1", { q: 0, r: 0 })).toBe(true);

    const pending = store.accept();
    expect(store.busy).toBe(true);
    store.cancel();
    expect(store.review).not.toBeNull();

    resolveSave(true);
    expect(await pending).toBe(true);
    expect(store.busy).toBe(false);
    expect(store.review).toBeNull();
    expect(store.message).toBe("saved");
  });
});
