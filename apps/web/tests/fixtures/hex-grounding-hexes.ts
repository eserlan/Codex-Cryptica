/**
 * Ten fixture hexes for the manual grounding check (SC-004, T093). Not used by
 * CI. Six hexes have a named location or faction within two hexes, and every
 * hex has terrain, so a run can check that drafts mention the terrain and the
 * nearby location, faction or its surroundings.
 */
import type { HexCoord, Terrain } from "hex-crawl-engine";

export interface GroundingNeighbour {
  kind: "location" | "faction";
  title: string;
  hex: HexCoord;
}

export interface GroundingFixtureHex {
  id: string;
  hex: HexCoord;
  terrain: Terrain;
  notes?: string;
  nearby: GroundingNeighbour[];
}

const preset = (
  id:
    | "plains"
    | "forest"
    | "hills"
    | "mountains"
    | "swamp"
    | "desert"
    | "water"
    | "coast"
    | "tundra",
): Terrain => ({
  kind: "preset",
  id,
});

export const GROUNDING_FIXTURE_HEXES: GroundingFixtureHex[] = [
  {
    id: "g01-forest-ford",
    hex: { q: 0, r: 0 },
    terrain: preset("forest"),
    notes: "A shallow ford crosses the river here.",
    nearby: [
      { kind: "location", title: "Hollow Ford Inn", hex: { q: 1, r: 0 } },
    ],
  },
  {
    id: "g02-swamp-causeway",
    hex: { q: 3, r: -1 },
    terrain: preset("swamp"),
    nearby: [],
  },
  {
    id: "g03-hills-watchtower",
    hex: { q: -2, r: 2 },
    terrain: preset("hills"),
    notes: "Old signal fires line the ridge.",
    nearby: [
      { kind: "faction", title: "Watchers of the Ridge", hex: { q: -1, r: 1 } },
    ],
  },
  {
    id: "g04-desert-glass",
    hex: { q: 4, r: 3 },
    terrain: { kind: "custom", label: "Glass dunes" },
    nearby: [],
  },
  {
    id: "g05-coast-harbour",
    hex: { q: -4, r: 0 },
    terrain: preset("coast"),
    nearby: [
      { kind: "location", title: "Saltmarsh Harbour", hex: { q: -3, r: 0 } },
    ],
  },
  {
    id: "g06-tundra-cairn",
    hex: { q: 0, r: -4 },
    terrain: preset("tundra"),
    notes: "A cairn marks a buried road.",
    nearby: [],
  },
  {
    id: "g07-mountains-pass",
    hex: { q: 2, r: 2 },
    terrain: preset("mountains"),
    nearby: [{ kind: "faction", title: "Pass Wardens", hex: { q: 2, r: 1 } }],
  },
  {
    id: "g08-water-lake",
    hex: { q: -3, r: -2 },
    terrain: preset("water"),
    nearby: [],
  },
  {
    id: "g09-plains-market",
    hex: { q: 1, r: -3 },
    terrain: preset("plains"),
    nearby: [
      { kind: "location", title: "Greyfield Market", hex: { q: 1, r: -2 } },
    ],
  },
  {
    id: "g10-forest-shrine",
    hex: { q: -1, r: -3 },
    terrain: preset("forest"),
    notes: "Offerings of bone rest at the shrine.",
    nearby: [
      { kind: "location", title: "Weeping Shrine", hex: { q: -1, r: -2 } },
    ],
  },
];
