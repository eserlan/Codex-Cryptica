import { getHexNeighbors, getHexRange, hexDistance } from "map-engine";
import {
  generateRegion,
  selectRegionTargets,
  toHexKey,
  type HexCoord,
  type HexCrawlState,
  type HexRecord,
  type RegionOperation,
  type RegionProposal,
  type RegionSettings,
  type TerrainId,
} from "../../src";

export const NOW = 1_700_000_000_000;
export const everywhere = () => true;
export const TEMPERATE: RegionSettings = { preset: "temperate", levels: {} };

export type FixedTerrain = TerrainId | { custom: string };

export function stateWith(
  terrain: Record<string, FixedTerrain> = {},
  extra: Record<string, Partial<HexRecord>> = {},
): HexCrawlState {
  const hexes: Record<string, HexRecord> = {};
  for (const [key, value] of Object.entries(terrain)) {
    hexes[key] = {
      terrain:
        typeof value === "string"
          ? { kind: "preset", id: value }
          : { kind: "custom", label: value.custom },
      updatedAt: NOW,
    };
  }
  for (const [key, patch] of Object.entries(extra)) {
    hexes[key] = {
      ...hexes[key],
      ...patch,
      updatedAt: patch.updatedAt ?? hexes[key]?.updatedAt ?? NOW,
    };
  }
  return { enabled: true, hexes };
}

export function fixedAround(
  centre: HexCoord,
  minRadius: number,
  maxRadius: number,
  pick: (hex: HexCoord) => FixedTerrain | null,
): Record<string, FixedTerrain> {
  const out: Record<string, FixedTerrain> = {};
  for (const hex of getHexRange(centre, maxRadius)) {
    const d = hexDistance(hex, centre);
    if (d < minRadius) continue;
    const t = pick(hex);
    if (t) out[toHexKey(hex)] = t;
  }
  return out;
}

export interface RunOptions {
  operation?: RegionOperation;
  centre?: HexCoord;
  radius?: number;
  settings?: RegionSettings;
  inBounds?: (hex: HexCoord) => boolean;
}

export function run(
  state: HexCrawlState,
  seed: string,
  options: RunOptions = {},
): RegionProposal {
  const operation = options.operation ?? "area";
  const centre = options.centre ?? { q: 0, r: 0 };
  const radius = options.radius ?? 4;
  const inBounds = options.inBounds ?? everywhere;
  const targets = selectRegionTargets({
    operation,
    state,
    centre,
    radius,
    inBounds,
  });
  if (!targets.ok) throw new Error(`targets refused: ${targets.reason}`);
  const result = generateRegion({
    request: {
      operation,
      centre,
      radius,
      seed,
      settings: options.settings ?? TEMPERATE,
    },
    state,
    targets: targets.targets,
    inBounds,
  });
  if (!result.ok) throw new Error(`generate refused: ${result.reason}`);
  return result.proposal;
}

export const SEEDS = Array.from({ length: 24 }, (_, i) => `FIXTURE-${i + 1}`);

/** Terrain a neighbour would show: proposed, fixed or null when undecided. */
export function terrainAt(
  proposal: RegionProposal,
  state: HexCrawlState,
  hex: HexCoord,
): TerrainId | "custom" | null {
  const key = toHexKey(hex);
  if (proposal.hexes[key]) return proposal.hexes[key];
  const t = state.hexes[key]?.terrain;
  if (!t) return null;
  return t.kind === "preset" ? t.id : "custom";
}

export function neighboursOf(hex: HexCoord) {
  return getHexNeighbors(hex);
}
