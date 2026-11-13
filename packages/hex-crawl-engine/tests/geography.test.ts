import { describe, expect, it } from "bun:test";
import { getHexRange } from "map-engine";
import {
  applyHexGeography,
  generateHexGeography,
  hexEdgeKey,
  normalizeHexCrawlState,
  parseHexEdgeKey,
  toHexKey,
  type HexCoord,
  type HexCrawlState,
  type CivilisationLevel,
} from "../src";

const centre = { q: 0, r: 0 };
const inside = (h: HexCoord) =>
  Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r)) <= 8;
function state(): HexCrawlState {
  const hexes: HexCrawlState["hexes"] = {};
  for (const hex of getHexRange(centre, 5)) {
    const id = hex.q <= -2 ? "water" : hex.r <= -2 ? "hills" : "plains";
    hexes[toHexKey(hex)] = { terrain: { kind: "preset", id }, updatedAt: 1 };
  }
  return { enabled: true, hexes };
}
function make(
  s: HexCrawlState,
  civilisation: CivilisationLevel = "frontier",
  seed = "TEST-SEED",
) {
  return generateHexGeography({
    state: s,
    request: { centre, radius: 5, seed, civilisation },
    settlements: [
      { q: 0, r: 0 },
      { q: 3, r: 0 },
    ],
    inBounds: inside,
  })!;
}

describe("shared-edge topology", () => {
  it("normalises both traversal directions to one canonical adjacent edge", () => {
    const a = { q: 0, r: 0 };
    const b = { q: 1, r: -1 };
    expect(hexEdgeKey(a, b)).toBe(hexEdgeKey(b, a));
    expect(parseHexEdgeKey(hexEdgeKey(a, b)!)).not.toBeNull();
    expect(hexEdgeKey(a, { q: 5, r: 5 })).toBeNull();
    expect(parseHexEdgeKey("0,0|5,5")).toBeNull();
  });

  it("drops malformed shared edges and mismatched flow while retaining valid ones", () => {
    const a = hexEdgeKey(centre, { q: 1, r: 0 })!;
    const normal = normalizeHexCrawlState({
      enabled: true,
      hexes: {},
      topology: {
        version: 1,
        edges: {
          [a]: {
            river: { from: "0,0", to: "1,0", provenance: { source: "manual" } },
          },
          "0,0|5,5": {
            road: { kind: "road", provenance: { source: "manual" } },
          },
          "1,-1|1,0": {
            river: { from: "0,0", to: "1,0", provenance: { source: "manual" } },
          },
        },
        sites: {},
      },
    });
    expect(Object.keys(normal.topology!.edges)).toEqual([a]);
  });

  it("gives identical proposals for a fixed seed and never mutates established map data", () => {
    const s = state();
    const before = structuredClone(s);
    expect(make(s)).toEqual(make(s));
    expect(s).toEqual(before);
  });

  it("coast edges match land/water and proposed connections cross adjacent hexes", () => {
    const isWaterHex = (
      s: ReturnType<typeof state>,
      coord: { q: number; r: number },
    ) => {
      const terrain = s.hexes[toHexKey(coord)]?.terrain;
      return terrain?.kind === "preset" && terrain.id === "water";
    };
    const s = state();
    const proposal = make(s);
    expect(Object.values(proposal.edges).some((e) => e.coast)).toBe(true);
    for (const [key, edge] of Object.entries(proposal.edges)) {
      const pair = parseHexEdgeKey(key)!;
      expect(pair).not.toBeNull();
      if (edge.coast)
        expect(isWaterHex(s, pair[0])).not.toBe(isWaterHex(s, pair[1]));
      if (edge.river) {
        expect([toHexKey(pair[0]), toHexKey(pair[1])].sort()).toEqual(
          [edge.river.from, edge.river.to].sort(),
        );
      }
    }
  });

  it("generates accessible road links between real pinned destinations", () => {
    const s = state();
    const proposal = make(s, "settled");
    const graph = new Map<string, Set<string>>();
    for (const [key, edge] of Object.entries(proposal.edges)) {
      if (!edge.road) continue;
      const [a, b] = parseHexEdgeKey(key)!;
      for (const [x, y] of [
        [toHexKey(a), toHexKey(b)],
        [toHexKey(b), toHexKey(a)],
      ]) {
        if (!graph.has(x)) graph.set(x, new Set());
        graph.get(x)!.add(y);
      }
    }
    const visited = new Set(["0,0"]);
    const pending = ["0,0"];
    while (pending.length) {
      for (const next of graph.get(pending.shift()!) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          pending.push(next);
        }
      }
    }
    expect(visited.has("3,0")).toBe(true);
  });

  it("settlement density depends on civilisation, never proposes on water or pins", () => {
    const s = state();
    const wilderness = make(s, "wilderness");
    const settled = make(s, "settled");
    expect(Object.keys(settled.sites).length).toBeGreaterThan(
      Object.keys(wilderness.sites).length,
    );
    for (const key of Object.keys(settled.sites)) {
      expect(
        s.hexes[key].terrain?.kind === "preset" &&
          s.hexes[key].terrain.id === "water",
      ).toBe(false);
      expect(["0,0", "3,0"]).not.toContain(key);
    }
  });

  it("persists topology without minting entities, and refuses stale writes", () => {
    const s = state();
    const a = hexEdgeKey({ q: 0, r: 0 }, { q: 1, r: 0 })!;
    s.topology = {
      version: 1,
      edges: {
        [a]: { road: { kind: "path", provenance: { source: "manual" } } },
      },
      sites: {},
    };
    const proposal = make(s);
    const result = applyHexGeography(s, proposal, new Set(), new Set());
    expect(result).not.toBeNull();
    expect(result!.topology!.edges[a].road?.provenance.source).toBe("manual");
    expect(
      normalizeHexCrawlState(JSON.parse(JSON.stringify(result))).topology,
    ).toEqual(result!.topology);
    expect(s.topology.edges).toHaveProperty(a);
    expect(
      applyHexGeography(
        {
          ...s,
          hexes: {
            ...s.hexes,
            "0,0": { ...s.hexes["0,0"], updatedAt: 2 },
          },
        },
        proposal,
        new Set(),
        new Set(),
      ),
    ).toBeNull();
  });

  it("river flow graph has no cycles or contradictory shared-edge directions", () => {
    const s = state();
    const p = make(s, "frontier", "RIVER-CYCLE-TEST");
    const next = new Map<string, string>();
    for (const edge of Object.values(p.edges)) {
      if (!edge.river) continue;
      expect(next.has(edge.river.from)).toBe(false);
      next.set(edge.river.from, edge.river.to);
    }
    for (const from of next.keys()) {
      const seen = new Set<string>();
      let current: string | undefined = from;
      while (current) {
        expect(seen.has(current)).toBe(false);
        seen.add(current);
        current = next.get(current);
      }
    }
  });
});
