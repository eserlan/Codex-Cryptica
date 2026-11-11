import { describe, expect, it } from "bun:test";
import {
  selectRegionTargets,
  toHexKey,
  type HexCoord,
  type RegionOperation,
} from "../../src";
import { everywhere, fixedAround, stateWith } from "./fixtures";

const centre = { q: 0, r: 0 };
const select = (
  state = stateWith(),
  operation: RegionOperation = "area",
  radius = 2,
  inBounds: (hex: HexCoord) => boolean = everywhere,
  at: HexCoord = centre,
) => selectRegionTargets({ operation, state, centre: at, radius, inBounds });
const keys = (r: ReturnType<typeof select>) =>
  r.ok ? r.targets.targets.map(toHexKey) : [];

describe("selectRegionTargets: area", () => {
  it("targets every empty hex within the radius, sorted by q then r", () => {
    const r = select();
    expect(r.ok && r.targets.targets).toHaveLength(19);
    const list = r.ok ? r.targets.targets : [];
    expect(list).toEqual([...list].sort((a, b) => a.q - b.q || a.r - b.r));
    expect(r.ok && r.targets.protected).toBe(0);
  });

  it("leaves out hexes that hold terrain, hand-set or generated, and counts them (FR-018)", () => {
    const state = stateWith({ "1,0": "forest", "0,1": "hills" });
    state.hexes["0,1"].generated = { seed: "A", rules: 1 };
    const r = select(state);
    expect(keys(r)).not.toContain("1,0");
    expect(keys(r)).not.toContain("0,1");
    expect(r.ok && r.targets.targets).toHaveLength(17);
    expect(r.ok && r.targets.protected).toBe(2);
  });

  it("still targets a hex that only has notes or an Explored flag", () => {
    const state = stateWith(
      {},
      { "1,0": { notes: "x" }, "0,1": { explored: true } },
    );
    expect(keys(select(state))).toEqual(expect.arrayContaining(["1,0", "0,1"]));
  });

  it("never targets a hex off the map (FR-006)", () => {
    const r = select(stateWith(), "area", 2, (h) => h.q >= 0);
    expect(keys(r).every((k) => Number(k.split(",")[0]) >= 0)).toBe(true);
    expect(r.ok && r.targets.targets.length).toBeLessThan(19);
  });

  it("refuses clearly and without side effects", () => {
    const frozen = stateWith({ "0,0": "forest" });
    const before = structuredClone(frozen);
    expect(select(frozen, "area", 0)).toEqual({
      ok: false,
      reason: "invalid-radius",
    });
    expect(select(frozen, "area", 13)).toEqual({
      ok: false,
      reason: "invalid-radius",
    });
    expect(select(frozen, "area", 2.5)).toEqual({
      ok: false,
      reason: "invalid-radius",
    });
    expect(select(frozen, "area", 2, () => false)).toEqual({
      ok: false,
      reason: "centre-off-map",
    });
    expect(
      select(stateWith(fixedAround(centre, 0, 1, () => "plains")), "area", 1),
    ).toEqual({ ok: false, reason: "nothing-to-generate" });
    expect(frozen).toEqual(before);
  });

  it("accepts the largest radius and its 469 hexes", () => {
    const r = select(stateWith(), "area", 12);
    expect(r.ok && r.targets.targets).toHaveLength(469);
  });
});

describe("selectRegionTargets: grow", () => {
  it("targets the centre and its empty neighbours, ignoring the radius", () => {
    const r = select(stateWith({ "1,0": "forest" }), "grow", 99);
    expect(r.ok && r.targets.targets).toHaveLength(6);
    expect(keys(r)).not.toContain("1,0");
  });
  it("leaves the centre out when it has terrain", () => {
    const r = select(stateWith({ "0,0": "forest" }), "grow");
    expect(keys(r)).not.toContain("0,0");
    expect(r.ok && r.targets.targets).toHaveLength(6);
  });
  it("leaves neighbours off the map out, and refuses when nothing is empty", () => {
    expect(keys(select(stateWith(), "grow", 1, (h) => h.q >= 0))).not.toContain(
      "-1,0",
    );
    const full = stateWith(fixedAround(centre, 0, 1, () => "plains"));
    expect(select(full, "grow")).toEqual({
      ok: false,
      reason: "nothing-to-generate",
    });
  });
});

describe("selectRegionTargets: gaps", () => {
  const AXES: HexCoord[] = [
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: 1, r: -1 },
  ];
  const line = (
    axis: HexCoord,
    length: number,
    end: "plains" | { custom: string } = "plains",
  ) => {
    const t: Record<string, "plains" | { custom: string }> = {
      [toHexKey({ q: 0, r: 0 })]: end,
      [toHexKey({ q: axis.q * (length + 1), r: axis.r * (length + 1) })]: end,
    };
    const mid = {
      q: axis.q * Math.ceil(length / 2),
      r: axis.r * Math.ceil(length / 2),
    };
    return { state: stateWith(t), mid };
  };

  it("bridges runs of 1 to 4 empty hexes along each hex axis", () => {
    for (const axis of AXES) {
      for (const length of [1, 2, 3, 4]) {
        const { state, mid } = line(axis, length);
        const r = select(state, "gaps", 6, everywhere, mid);
        expect(
          r.ok && r.targets.targets.length,
          `axis ${axis.q},${axis.r} length ${length}`,
        ).toBe(length);
      }
    }
  });

  it("does not bridge a run of 5", () => {
    for (const axis of AXES) {
      const { state, mid } = line(axis, 5);
      expect(select(state, "gaps", 6, everywhere, mid)).toEqual({
        ok: false,
        reason: "nothing-to-generate",
      });
    }
  });

  it("counts custom terrain as established", () => {
    const { state, mid } = line(AXES[0], 3, { custom: "Glass dunes" });
    expect(select(state, "gaps", 6, everywhere, mid).ok).toBe(true);
  });

  it("fills a hole completely surrounded by terrain, of any size", () => {
    const one = select(
      stateWith(fixedAround(centre, 1, 1, () => "plains")),
      "gaps",
      4,
    );
    expect(keys(one)).toEqual(["0,0"]);
    const seven = select(
      stateWith(fixedAround(centre, 2, 2, () => "plains")),
      "gaps",
      4,
    );
    expect(seven.ok && seven.targets.targets).toHaveLength(7);
  });

  it("treats the map edge as a wall", () => {
    const edge = (h: HexCoord) => h.q >= 0;
    const state = stateWith({
      "1,0": "plains",
      "1,-1": "plains",
      "0,-1": "plains",
      "0,1": "plains",
    });
    expect(keys(select(state, "gaps", 3, edge))).toContain("0,0");
  });

  it("leaves open country beside a single area alone, and says when there is nothing to fill", () => {
    const state = stateWith(fixedAround(centre, 0, 1, () => "forest"));
    expect(select(state, "gaps", 6)).toEqual({
      ok: false,
      reason: "nothing-to-generate",
    });
    expect(select(stateWith(), "gaps", 6)).toEqual({
      ok: false,
      reason: "nothing-to-generate",
    });
  });
});

describe("selectRegionTargets: regenerate", () => {
  it("targets only generated terrain and counts hand-set terrain as protected (FR-019, FR-021)", () => {
    const state = stateWith({
      "0,0": "forest",
      "1,0": "hills",
      "0,1": "plains",
    });
    state.hexes["0,0"].generated = { seed: "A", rules: 1 };
    state.hexes["1,0"].generated = { seed: "A", rules: 1 };
    const r = select(state, "regenerate");
    expect(keys(r).sort()).toEqual(["0,0", "1,0"]);
    expect(r.ok && r.targets.protected).toBe(1);
  });
  it("has nothing to do when no hex in range is generated", () => {
    expect(select(stateWith({ "0,0": "forest" }), "regenerate")).toEqual({
      ok: false,
      reason: "nothing-to-generate",
    });
  });
});
