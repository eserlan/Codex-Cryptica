import { describe, expect, it } from "vitest";
import {
  hexEdgeFeatureKey,
  hexEdgeKey,
  type GeographyProposal,
  type HexTopology,
} from "hex-crawl-engine";
import {
  visibleGeographyEdges,
  visibleGeographySites,
} from "./geography-overlay-model";

const provenance = { source: "generated" as const, seed: "s", rules: 1 };

const projection = {
  gridConfig: {
    orientation: "pointy" as const,
    size: 20,
    offsetX: 0,
    offsetY: 0,
  },
  project: (point: { x: number; y: number }) => point,
  viewport: { width: 800, height: 600 },
  zoom: 1,
};

describe("geography-overlay-model", () => {
  it("renders more than 2500 in-viewport edges and sites without silent cutoffs", () => {
    const edges: HexTopology["edges"] = {};
    const sites: HexTopology["sites"] = {};
    for (let i = 0; i < 2600; i += 1) {
      const key = hexEdgeKey({ q: 0, r: i }, { q: 1, r: i });
      if (!key) throw new Error("expected valid adjacent edge key");
      edges[key] = { road: { kind: "road", provenance } };
      sites[`0,${i}`] = { kind: "village", provenance };
    }
    const zeroProject = {
      ...projection,
      project: () => ({ x: 100, y: 100 }),
    };

    const visibleEdges = visibleGeographyEdges(
      { version: 1, edges, sites },
      null,
      new Set(),
      zeroProject,
    );
    const visibleSites = visibleGeographySites(
      { version: 1, edges, sites },
      null,
      new Set(),
      zeroProject,
    );

    expect(visibleEdges).toHaveLength(2600);
    expect(visibleSites).toHaveLength(2600);
  });

  it("tracks proposed and disabled edge features and filters off-screen items", () => {
    const edgeKey = hexEdgeKey({ q: 0, r: 0 }, { q: 1, r: 0 });
    if (!edgeKey) throw new Error("expected valid adjacent edge key");
    const topology: HexTopology = {
      version: 1,
      edges: { [edgeKey]: { coast: true } },
      sites: { "0,0": { kind: "town", provenance } },
    };
    const proposal: GeographyProposal = {
      request: {
        centre: { q: 0, r: 0 },
        radius: 1,
        seed: "s",
        civilisation: "settled",
      },
      edges: {
        [edgeKey]: { river: { from: "0,0", to: "1,0", provenance } },
      },
      sites: {
        "1,0": { kind: "village", provenance },
        "99,99": { kind: "hamlet", provenance },
      },
      terrainStamps: {},
      topologyStamp: "null",
      settlementStamp: "[]",
    };

    const disabledFeature = hexEdgeFeatureKey(edgeKey, "river");
    const edges = visibleGeographyEdges(
      topology,
      proposal,
      new Set([disabledFeature]),
      projection,
    );
    expect(edges).toHaveLength(1);
    expect(edges[0].proposedFeatures).toEqual(["river"]);
    expect(edges[0].disabledFeatures.has(disabledFeature)).toBe(true);

    const sites = visibleGeographySites(
      topology,
      proposal,
      new Set(["1,0"]),
      projection,
    );
    expect(sites.map((s) => s.key)).toEqual(["0,0", "1,0"]);
    expect(sites[0]).toMatchObject({ proposed: false, disabled: false });
    expect(sites[1]).toMatchObject({ proposed: true, disabled: true });
  });
});
