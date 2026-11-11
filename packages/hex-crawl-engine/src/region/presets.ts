import type { TerrainId } from "../terrain";
import type { LandscapePresetId, TerrainLevel } from "./types";

/** Where a terrain sits on the height / wetness chart. These are tuning dials, not geography. */
export interface TerrainPoint {
  height: number;
  wetness: number;
}

export const TERRAIN_POINTS: Readonly<Record<TerrainId, TerrainPoint>> = {
  water: { height: 0.05, wetness: 0.65 },
  coast: { height: 0.12, wetness: 0.6 },
  swamp: { height: 0.18, wetness: 0.92 },
  plains: { height: 0.32, wetness: 0.5 },
  forest: { height: 0.42, wetness: 0.78 },
  desert: { height: 0.36, wetness: 0.05 },
  tundra: { height: 0.46, wetness: 0.25 },
  hills: { height: 0.64, wetness: 0.5 },
  mountains: { height: 0.92, wetness: 0.35 },
};

export interface LandscapePreset {
  label: string;
  heightBias: number;
  wetnessBias: number;
  /** Base weight per terrain. Coast is placed by the coast rule, not by weight. */
  weights: Readonly<Record<TerrainId, number>>;
}

export const LANDSCAPE_PRESETS: Readonly<
  Record<LandscapePresetId, LandscapePreset>
> = {
  temperate: {
    label: "Temperate",
    heightBias: 0,
    wetnessBias: 0,
    weights: {
      plains: 1.2,
      forest: 1.2,
      hills: 1,
      mountains: 0.8,
      swamp: 0.5,
      desert: 0.2,
      water: 0.9,
      coast: 1,
      tundra: 0.2,
    },
  },
  coastal: {
    label: "Coastal",
    heightBias: -0.15,
    wetnessBias: 0.1,
    weights: {
      plains: 1.2,
      forest: 1,
      hills: 0.6,
      mountains: 0.3,
      swamp: 0.9,
      desert: 0.1,
      water: 1.6,
      coast: 1,
      tundra: 0.1,
    },
  },
  highlands: {
    label: "Highlands",
    heightBias: 0.2,
    wetnessBias: 0,
    weights: {
      plains: 0.7,
      forest: 1,
      hills: 1.5,
      mountains: 1.5,
      swamp: 0.2,
      desert: 0.2,
      water: 0.5,
      coast: 1,
      tundra: 0.5,
    },
  },
  arid: {
    label: "Arid",
    heightBias: 0,
    wetnessBias: -0.3,
    weights: {
      plains: 1,
      forest: 0.2,
      hills: 1,
      mountains: 0.8,
      swamp: 0.05,
      desert: 2,
      water: 0.2,
      coast: 1,
      tundra: 0.1,
    },
  },
  frozen: {
    label: "Frozen",
    heightBias: 0.05,
    wetnessBias: -0.1,
    weights: {
      plains: 0.5,
      forest: 0.8,
      hills: 1,
      mountains: 1,
      swamp: 0.3,
      desert: 0.05,
      water: 0.6,
      coast: 1,
      tundra: 2.2,
    },
  },
};

export const LEVEL_MULTIPLIER: Readonly<Record<TerrainLevel, number>> = {
  none: 0,
  less: 0.5,
  normal: 1,
  more: 2,
};
