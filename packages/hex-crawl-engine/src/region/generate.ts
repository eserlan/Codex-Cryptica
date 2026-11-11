import { getHexRange, hexDistance } from "map-engine";
import {
  toHexKey,
  type HexCoord,
  type HexCrawlState,
  type HexKey,
} from "../model";
import { PRESET_TERRAIN_IDS, type TerrainId } from "../terrain";
import { hexNoise } from "./noise";
import {
  LANDSCAPE_PRESETS,
  LEVEL_MULTIPLIER,
  TERRAIN_POINTS,
  type LandscapePreset,
} from "./presets";
import { repairProposal } from "./repair";
import { hashSeed } from "./seed";
import { availableTerrains, terrainLevel } from "./settings";
import {
  REGION_RULES_VERSION,
  type RegionProposal,
  type RegionRefusal,
  type RegionRequest,
  type RegionTargets,
} from "./types";

export interface GenerateRegionInput {
  request: RegionRequest;
  state: HexCrawlState;
  targets: RegionTargets;
  inBounds: (hex: HexCoord) => boolean;
}

/** How hard existing terrain pulls a hex towards itself, by distance in hexes. */
const ANCHOR_PULL = [0, 1.2, 0.5] as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

interface Field {
  height: number;
  wetness: number;
}

/**
 * The hex's height and wetness: seeded noise at its own position, pulled
 * towards fixed terrain within two hexes. Hexes that are themselves being
 * generated never pull, so the result does not depend on the rest of the request.
 */
function fieldAt(
  hex: HexCoord,
  seed: number,
  preset: LandscapePreset,
  state: HexCrawlState,
  targetKeys: ReadonlySet<HexKey>,
): Field {
  let pull = 1;
  let height = clamp01(hexNoise(seed, hex, "height") + preset.heightBias);
  let wetness = clamp01(hexNoise(seed, hex, "wetness") + preset.wetnessBias);
  for (const near of getHexRange(hex, 2)) {
    const key = toHexKey(near);
    const terrain = state.hexes[key]?.terrain;
    if (targetKeys.has(key) || terrain?.kind !== "preset") continue;
    const strength = ANCHOR_PULL[hexDistance(hex, near)] ?? 0;
    if (strength === 0) continue;
    height += strength * TERRAIN_POINTS[terrain.id].height;
    wetness += strength * TERRAIN_POINTS[terrain.id].wetness;
    pull += strength;
  }
  return { height: height / pull, wetness: wetness / pull };
}

/** The terrain whose place on the chart is nearest, with more weight meaning a bigger patch. */
function nearestTerrain(
  field: Field,
  choices: readonly TerrainId[],
  weight: (id: TerrainId) => number,
): TerrainId {
  let best = choices[0];
  let bestScore = Infinity;
  for (const id of PRESET_TERRAIN_IDS) {
    if (!choices.includes(id)) continue;
    const point = TERRAIN_POINTS[id];
    const score =
      ((field.height - point.height) ** 2 +
        (field.wetness - point.wetness) ** 2) /
      weight(id);
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

/** Which targets would change when regenerated, and which of those are explored. */
function regenerationChanges(
  targets: readonly HexCoord[],
  state: HexCrawlState,
  proposed: Record<HexKey, TerrainId>,
): { changes: HexKey[]; exploredChanges: HexKey[] } {
  const changes: HexKey[] = [];
  const exploredChanges: HexKey[] = [];
  for (const hex of targets) {
    const key = toHexKey(hex);
    const record = state.hexes[key];
    const current =
      record?.terrain?.kind === "preset" ? record.terrain.id : null;
    if (current === proposed[key]) continue;
    changes.push(key);
    if (record?.explored) exploredChanges.push(key);
  }
  return { changes, exploredChanges };
}

/**
 * Propose terrain for the targets (research D1). Each hex's height and
 * wetness come from seeded noise at its own position, are pulled towards
 * existing terrain close by, and the nearest terrain on the chart wins.
 * Nothing here depends on which other hexes are targets.
 */
export function generateRegion(
  input: GenerateRegionInput,
):
  | { ok: true; proposal: RegionProposal }
  | { ok: false; reason: RegionRefusal } {
  const { request, state, targets, inBounds } = input;
  const available = availableTerrains(request.settings);
  const choices: TerrainId[] = available.filter((id) => id !== "coast");
  if (choices.length === 0)
    return { ok: false, reason: "no-terrain-available" };

  const preset = LANDSCAPE_PRESETS[request.settings.preset];
  const weight = (id: TerrainId) =>
    preset.weights[id] * LEVEL_MULTIPLIER[terrainLevel(request.settings, id)];
  const seed = hashSeed(request.seed);
  const targetKeys = new Set(targets.targets.map(toHexKey));

  const proposed: Record<HexKey, TerrainId> = {};
  const stamps: Record<HexKey, number> = {};
  for (const hex of targets.targets) {
    const key = toHexKey(hex);
    proposed[key] = nearestTerrain(
      fieldAt(hex, seed, preset, state, targetKeys),
      choices,
      weight,
    );
    stamps[key] = state.hexes[key]?.updatedAt ?? 0;
  }
  repairProposal({
    proposed,
    targets: targets.targets,
    state,
    inBounds,
    available: new Set(available),
  });

  const { changes, exploredChanges } =
    request.operation === "regenerate"
      ? regenerationChanges(targets.targets, state, proposed)
      : { changes: [], exploredChanges: [] };

  return {
    ok: true,
    proposal: {
      request,
      rules: REGION_RULES_VERSION,
      hexes: proposed,
      stamps,
      protected: targets.protected,
      changes,
      exploredChanges,
    },
  };
}
