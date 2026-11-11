import { describe, expect, it } from "bun:test";
import { getHexNeighbors } from "map-engine";
import { toHexKey, type HexCoord } from "../../src";
import {
  SEEDS,
  fixedAround,
  neighboursOf,
  run,
  stateWith,
  terrainAt,
} from "./fixtures";

const isLand = (t: string | null) =>
  t !== null && t !== "water" && t !== "coast" && t !== "custom";

describe("coherence: clustering (SC-004)", () => {
  it("gathers like terrain into patches rather than a scatter", () => {
    const shares: number[] = [];
    for (const seed of SEEDS) {
      const state = stateWith();
      const p = run(state, seed, { radius: 6 });
      let withLike = 0;
      for (const [key, id] of Object.entries(p.hexes)) {
        const [q, r] = key.split(",").map(Number);
        if (getHexNeighbors({ q, r }).some((n) => p.hexes[toHexKey(n)] === id))
          withLike++;
      }
      shares.push(withLike / Object.keys(p.hexes).length);
    }
    const mean = shares.reduce((a, b) => a + b, 0) / shares.length;
    expect(mean).toBeGreaterThanOrEqual(0.8);
    expect(Math.min(...shares)).toBeGreaterThanOrEqual(0.7);
  });
});

describe("coherence: meeting fixed terrain (FR-008)", () => {
  // Forest wall to the west, plains wall to the east, open ground between.
  const world = () =>
    stateWith({
      ...fixedAround({ q: 0, r: 0 }, 0, 9, (h) =>
        h.q <= -6 ? "forest" : h.q >= 6 ? "plains" : null,
      ),
    });

  /** Share of hexes in one column that took the terrain of the fixed wall beside it. */
  const matchShare = (column: number, wanted: string) => {
    let beside = 0;
    let hit = 0;
    for (const seed of SEEDS) {
      const p = run(world(), seed, { radius: 5 });
      for (const [key, id] of Object.entries(p.hexes)) {
        if (Number(key.split(",")[0]) !== column) continue;
        beside++;
        if (id === wanted) hit++;
      }
    }
    return hit / beside;
  };

  it("continues forest from the forest side and plains from the plains side", () => {
    expect(matchShare(-5, "forest")).toBeGreaterThan(0.6);
    expect(matchShare(5, "plains")).toBeGreaterThan(0.6);
  });

  it("never copies or replaces custom terrain, and never proposes custom terrain", () => {
    const custom = {
      "2,0": { custom: "Glass dunes" },
      "-2,1": { custom: "Sunken road" },
    } as const;
    for (const seed of SEEDS) {
      const state = stateWith({ ...custom });
      const p = run(state, seed, { radius: 4 });
      expect(p.hexes["2,0"]).toBeUndefined();
      expect(p.hexes["-2,1"]).toBeUndefined();
      for (const id of Object.values(p.hexes)) expect(typeof id).toBe("string");
      expect(state.hexes["2,0"].terrain).toEqual({
        kind: "custom",
        label: "Glass dunes",
      });
    }
  });
});

describe("coherence: hills and mountains (FR-009a)", () => {
  it("puts mountains only beside hills or other mountains, or where more could still be added", () => {
    for (const seed of SEEDS) {
      const state = stateWith(
        fixedAround({ q: 0, r: 0 }, 0, 9, (h) =>
          h.q <= -6 ? "hills" : h.q >= 6 ? "mountains" : null,
        ),
      );
      const p = run(state, seed, {
        radius: 5,
        settings: { preset: "highlands", levels: {} },
      });
      for (const [key, id] of Object.entries(p.hexes)) {
        if (id !== "mountains") continue;
        const [q, r] = key.split(",").map(Number);
        const ok = neighboursOf({ q, r }).some((n) => {
          const t = terrainAt(p, state, n);
          return (
            t === null || t === "hills" || t === "mountains" || t === "custom"
          );
        });
        expect(ok, `${seed} ${key}`).toBe(true);
      }
    }
  });

  it("holds on open ground in every preset", () => {
    for (const preset of [
      "temperate",
      "coastal",
      "highlands",
      "arid",
      "frozen",
    ] as const) {
      for (const seed of SEEDS.slice(0, 8)) {
        const state = stateWith();
        const p = run(state, seed, {
          radius: 6,
          settings: { preset, levels: {} },
        });
        for (const [key, id] of Object.entries(p.hexes)) {
          if (id !== "mountains") continue;
          const [q, r] = key.split(",").map(Number);
          const near = neighboursOf({ q, r }).map((n) =>
            terrainAt(p, state, n),
          );
          expect(
            near.some((t) => t === null || t === "hills" || t === "mountains"),
            `${preset} ${seed} ${key}`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("coherence: coasts (FR-009)", () => {
  const coastal = () =>
    stateWith(
      fixedAround({ q: 0, r: 0 }, 0, 9, (h) =>
        h.q <= -6 ? "plains" : h.q >= 6 ? "water" : null,
      ),
    );

  it("proposes coast only where it borders water and dry ground, or could still come to", () => {
    for (const seed of SEEDS) {
      for (const state of [coastal(), stateWith()]) {
        const p = run(state, seed, {
          radius: 5,
          settings: { preset: "coastal", levels: {} },
        });
        for (const [key, id] of Object.entries(p.hexes)) {
          if (id !== "coast") continue;
          const [q, r] = key.split(",").map(Number);
          const near = neighboursOf({ q, r } as HexCoord).map((n) =>
            terrainAt(p, state, n),
          );
          const water = near.some(
            (t) => t === null || t === "water" || t === "custom",
          );
          const land = near.some((t) => t === null || t !== "water");
          expect(water && land, `${seed} ${key}`).toBe(true);
        }
      }
    }
  });

  it("keeps open water from touching proposed inland terrain directly", () => {
    let touching = 0;
    let waterHexes = 0;
    for (const seed of SEEDS) {
      const state = coastal();
      const p = run(state, seed, {
        radius: 5,
        settings: { preset: "coastal", levels: {} },
      });
      for (const [key, id] of Object.entries(p.hexes)) {
        if (id !== "water") continue;
        waterHexes++;
        const [q, r] = key.split(",").map(Number);
        if (
          neighboursOf({ q, r }).some((n) => {
            const t = terrainAt(p, state, n);
            return isLand(t) && p.hexes[toHexKey(n)] !== undefined;
          })
        )
          touching++;
      }
    }
    expect(waterHexes).toBeGreaterThan(0);
    expect(touching / waterHexes).toBeLessThan(0.05);
  });

  it("meets a fixed shore with coast rather than raw inland terrain", () => {
    let shore = 0;
    let coast = 0;
    for (const seed of SEEDS) {
      const state = coastal();
      const p = run(state, seed, {
        radius: 5,
        settings: { preset: "coastal", levels: {} },
      });
      for (const [key, id] of Object.entries(p.hexes)) {
        const [q, r] = key.split(",").map(Number);
        if (q !== 5) continue; // beside the fixed water column at q = 6
        shore++;
        if (id === "coast" || id === "water") coast++;
        void r;
      }
    }
    expect(coast / shore).toBeGreaterThan(0.9);
  });
});
