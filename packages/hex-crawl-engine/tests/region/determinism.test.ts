import { describe, expect, it } from "bun:test";
import { applyRegionProposal, toHexKey } from "../../src";
import { NOW, SEEDS, run, stateWith } from "./fixtures";

describe("determinism (FR-014, SC-003)", () => {
  it("gives deeply equal proposals for equal inputs, over many runs", () => {
    const state = stateWith({ "5,0": "forest", "-5,2": "water" });
    const first = run(state, "DET-1", { radius: 6 });
    for (let i = 0; i < 20; i++)
      expect(run(state, "DET-1", { radius: 6 })).toEqual(first);
  });

  it("matches a literal snapshot (a regression guard; cross-device repeatability rests on the integer-only noise, pinned in noise.test.ts)", () => {
    const p = run(stateWith(), "K7Q2-9FXM", { radius: 1 });
    // If this changes, every landscape changes: raise REGION_RULES_VERSION.
    expect(Object.entries(p.hexes).sort()).toEqual(SNAPSHOT);
  });

  it("gives a different landscape for a different seed", () => {
    expect(run(stateWith(), "DET-A", { radius: 5 }).hexes).not.toEqual(
      run(stateWith(), "DET-B", { radius: 5 }).hexes,
    );
  });
});

describe("growing in passes (FR-016)", () => {
  it("never changes earlier hexes, and matches a single request away from the seam", () => {
    for (const seed of SEEDS.slice(0, 8)) {
      const west = run(stateWith(), seed, {
        radius: 3,
        centre: { q: -3, r: 0 },
      });
      const state = applyRegionProposal(stateWith(), west, {}, NOW).state;
      const before = structuredClone(state.hexes);
      const east = run(state, seed, { radius: 3, centre: { q: 3, r: 0 } });
      const after = applyRegionProposal(state, east, {}, NOW + 1).state;
      for (const [key, record] of Object.entries(before))
        expect(after.hexes[key]).toEqual(record);

      const single = run(stateWith(), seed, {
        radius: 6,
        centre: { q: 0, r: 0 },
      });
      for (const [key, id] of Object.entries(east.hexes)) {
        const [q, r] = key.split(",").map(Number);
        const nearWest = Object.keys(west.hexes).some((k) => {
          const [wq, wr] = k.split(",").map(Number);
          return (
            Math.max(
              Math.abs(q - wq),
              Math.abs(r - wr),
              Math.abs(q + r - wq - wr),
            ) <= 3
          );
        });
        if (nearWest || single.hexes[key] === undefined) continue;
        expect(single.hexes[key], `${seed} ${key}`).toBe(id);
      }
    }
  });

  it("leaves no invalid coast where passes meet", () => {
    for (const seed of SEEDS) {
      const west = run(stateWith(), seed, {
        radius: 3,
        centre: { q: -3, r: 0 },
        settings: { preset: "coastal", levels: {} },
      });
      const state = applyRegionProposal(stateWith(), west, {}, NOW).state;
      const east = run(state, seed, {
        radius: 3,
        centre: { q: 3, r: 0 },
        settings: { preset: "coastal", levels: {} },
      });
      const merged = applyRegionProposal(state, east, {}, NOW + 1).state;
      for (const [key, record] of Object.entries(merged.hexes)) {
        if (record.terrain?.kind !== "preset" || record.terrain.id !== "coast")
          continue;
        const [q, r] = key.split(",").map(Number);
        const near = [
          [1, 0],
          [1, -1],
          [0, -1],
          [-1, 0],
          [-1, 1],
          [0, 1],
        ].map(([dq, dr]) => {
          const t = merged.hexes[toHexKey({ q: q + dq, r: r + dr })]?.terrain;
          return t?.kind === "preset" ? t.id : null;
        });
        const water = near.some((t) => t === null || t === "water");
        const land = near.some((t) => t === null || t !== "water");
        expect(water && land, `${seed} ${key}`).toBe(true);
      }
    }
  });

  it("works with grow passes from neighbouring hexes", () => {
    const seed = "GROW-1";
    let state = stateWith();
    const centres = [
      { q: 0, r: 0 },
      { q: 2, r: 0 },
      { q: 1, r: 2 },
    ];
    for (const [i, centre] of centres.entries()) {
      const before = structuredClone(state.hexes);
      const p = run(state, seed, { operation: "grow", centre });
      state = applyRegionProposal(state, p, {}, NOW + i).state;
      for (const [key, record] of Object.entries(before))
        expect(state.hexes[key]).toEqual(record);
    }
    expect(Object.keys(state.hexes).length).toBeGreaterThan(12);
  });
});

const SNAPSHOT: Array<[string, string]> = [
  ["-1,0", "coast"],
  ["-1,1", "coast"],
  ["0,-1", "water"],
  ["0,0", "water"],
  ["0,1", "water"],
  ["1,-1", "water"],
  ["1,0", "water"],
];
