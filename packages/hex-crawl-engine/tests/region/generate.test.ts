import { describe, expect, it } from "bun:test";
import {
  PRESET_TERRAIN_IDS,
  REGION_RULES_VERSION,
  generateRegion,
  selectRegionTargets,
  toHexKey,
  type RegionSettings,
  type TerrainId,
} from "../../src";
import { SEEDS, TEMPERATE, everywhere, run, stateWith } from "./fixtures";

const levels = (
  l: RegionSettings["levels"],
  preset: RegionSettings["preset"] = "temperate",
): RegionSettings => ({ preset, levels: l });
const share = (settings: RegionSettings, id: TerrainId) => {
  let hit = 0;
  let total = 0;
  for (const seed of SEEDS) {
    const p = run(stateWith(), seed, { radius: 6, settings });
    for (const t of Object.values(p.hexes)) {
      total++;
      if (t === id) hit++;
    }
  }
  return hit / total;
};

describe("generateRegion: basics", () => {
  it("gives every target one standard terrain and records the rules version", () => {
    const p = run(stateWith(), "ALPHA");
    expect(Object.keys(p.hexes)).toHaveLength(61);
    for (const t of Object.values(p.hexes))
      expect(PRESET_TERRAIN_IDS).toContain(t);
    expect(p.rules).toBe(REGION_RULES_VERSION);
  });

  it("proposes nothing for hexes that are not targets and does not touch the state", () => {
    const state = stateWith({ "0,0": "forest" });
    const before = structuredClone(state);
    const p = run(state, "ALPHA", { radius: 2 });
    expect(p.hexes["0,0"]).toBeUndefined();
    expect(state).toEqual(before);
  });

  it("stamps each target with its updatedAt, or 0 when it has no record", () => {
    const state = stateWith({}, { "1,0": { notes: "x", updatedAt: 5 } });
    const p = run(state, "ALPHA", { radius: 2 });
    expect(p.stamps["1,0"]).toBe(5);
    expect(p.stamps["0,0"]).toBe(0);
  });

  it("never proposes a terrain set to none, and still honours fixed neighbours of that terrain", () => {
    const settings = levels({ water: "none", coast: "none", swamp: "none" });
    for (const seed of SEEDS) {
      const p = run(stateWith({ "6,0": "water" }), seed, {
        radius: 5,
        settings,
      });
      for (const t of Object.values(p.hexes))
        expect(["water", "coast", "swamp"]).not.toContain(t);
    }
  });

  it("refuses when no terrain is available (FR-010a)", () => {
    const all = Object.fromEntries(
      PRESET_TERRAIN_IDS.map((id) => [id, "none" as const]),
    );
    const onlyCoast = Object.fromEntries(
      PRESET_TERRAIN_IDS.filter((id) => id !== "coast").map((id) => [
        id,
        "none" as const,
      ]),
    );
    for (const l of [all, onlyCoast]) {
      const state = stateWith();
      const targets = selectRegionTargets({
        operation: "area",
        state,
        centre: { q: 0, r: 0 },
        radius: 2,
        inBounds: everywhere,
      });
      if (!targets.ok) throw new Error("setup");
      const result = generateRegion({
        request: {
          operation: "area",
          centre: { q: 0, r: 0 },
          radius: 2,
          seed: "A",
          settings: levels(l),
        },
        state,
        targets: targets.targets,
        inBounds: everywhere,
      });
      expect(result).toEqual({ ok: false, reason: "no-terrain-available" });
    }
  });
});

describe("generateRegion: presets and levels", () => {
  it("shifts the landscape with the preset", () => {
    expect(share(levels({}, "arid"), "desert")).toBeGreaterThan(
      share(TEMPERATE, "desert") * 2,
    );
    expect(share(levels({}, "frozen"), "tundra")).toBeGreaterThan(
      share(TEMPERATE, "tundra") * 2,
    );
    expect(share(levels({}, "coastal"), "water")).toBeGreaterThan(
      share(TEMPERATE, "water"),
    );
    expect(share(levels({}, "highlands"), "mountains")).toBeGreaterThan(
      share(TEMPERATE, "mountains"),
    );
  });

  it("makes a terrain more or less common with its level", () => {
    const less = share(levels({ forest: "less" }), "forest");
    const normal = share(levels({}), "forest");
    const more = share(levels({ forest: "more" }), "forest");
    expect(less).toBeLessThan(normal);
    expect(normal).toBeLessThan(more);
  });
});

describe("generateRegion: regenerate", () => {
  const generatedOnce = () => {
    const first = run(stateWith(), "SEED-ONE", { radius: 3 });
    const state = stateWith();
    for (const [key, id] of Object.entries(first.hexes)) {
      state.hexes[key] = {
        terrain: { kind: "preset", id },
        generated: { seed: "SEED-ONE", rules: 1 },
        updatedAt: 1,
      };
    }
    return state;
  };

  it("reports no change when regenerating with the same seed and surroundings", () => {
    const state = generatedOnce();
    const p = run(state, "SEED-ONE", { operation: "regenerate", radius: 3 });
    expect(p.changes).toEqual([]);
    expect(p.exploredChanges).toEqual([]);
  });

  it("lists exactly the hexes that would change, and the explored ones among them (FR-020, FR-020a)", () => {
    const state = generatedOnce();
    for (const key of Object.keys(state.hexes))
      state.hexes[key].explored = true;
    const p = run(state, "SEED-TWO", { operation: "regenerate", radius: 3 });
    const expected = Object.keys(p.hexes).filter((k) => {
      const t = state.hexes[k].terrain;
      return !(t?.kind === "preset" && t.id === p.hexes[k]);
    });
    expect(p.changes.sort()).toEqual(expected.sort());
    expect(p.changes.length).toBeGreaterThan(0);
    expect(p.exploredChanges.sort()).toEqual(expected.sort());
  });

  it("does not treat hexes being regenerated as anchors for each other", () => {
    const state = generatedOnce();
    const a = run(state, "SEED-THREE", { operation: "regenerate", radius: 3 });
    const b = run(stateWith(), "SEED-THREE", { radius: 3 });
    expect(a.hexes).toEqual(b.hexes);
  });
});

describe("generateRegion: positions", () => {
  it("uses only the hex's own position, so a hex is the same in any request that contains it", () => {
    const wide = run(stateWith(), "STABLE", { radius: 6 });
    const narrow = run(stateWith(), "STABLE", { radius: 3 });
    let compared = 0;
    for (const [key, id] of Object.entries(narrow.hexes)) {
      const [q, r] = key.split(",").map(Number);
      const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      if (d > 1) continue; // rim hexes can differ through the repair pass only
      expect(wide.hexes[toHexKey({ q, r })]).toBe(id);
      compared++;
    }
    expect(compared).toBeGreaterThan(0);
  });
});
