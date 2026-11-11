import type { HexCoord, HexKey, HexRecord } from "../model";
import type { Terrain, TerrainId } from "../terrain";

/** Version of the landscape rules. Raise it when output for an existing seed changes. */
export const REGION_RULES_VERSION = 1;
export const REGION_MIN_RADIUS = 1;
export const REGION_MAX_RADIUS = 12;
/** Hexes within radius 12 of a centre. */
export const REGION_MAX_HEXES = 469;
/** Longest run of empty hexes that still counts as a gap between established terrain. */
export const GAP_CORRIDOR_MAX = 4;

export const LANDSCAPE_PRESET_IDS = [
  "temperate",
  "coastal",
  "highlands",
  "arid",
  "frozen",
] as const;
export type LandscapePresetId = (typeof LANDSCAPE_PRESET_IDS)[number];

export const TERRAIN_LEVELS = ["none", "less", "normal", "more"] as const;
export type TerrainLevel = (typeof TERRAIN_LEVELS)[number];

export type RegionOperation = "area" | "grow" | "gaps" | "regenerate";

export interface RegionSettings {
  preset: LandscapePresetId;
  /** Only terrains the GM changed; every other terrain is Normal. */
  levels: Partial<Record<TerrainId, TerrainLevel>>;
}

export interface RegionRequest {
  operation: RegionOperation;
  centre: HexCoord;
  /** 1 to 12. Ignored for `grow`. */
  radius: number;
  seed: string;
  settings: RegionSettings;
}

export type RegionRefusal =
  | "nothing-to-generate"
  | "too-large"
  | "invalid-radius"
  | "centre-off-map"
  | "no-terrain-available";

export interface RegionTargets {
  /** Sorted by q, then r. */
  targets: HexCoord[];
  /** Candidates left out because they hold terrain this operation may not change. */
  protected: number;
}

export interface RegionProposal {
  request: RegionRequest;
  rules: number;
  hexes: Record<HexKey, TerrainId>;
  /** `updatedAt` of each target when proposed (0 when it had no record). */
  stamps: Record<HexKey, number>;
  protected: number;
  /** `regenerate` only: targets whose terrain would differ from now. */
  changes: HexKey[];
  /** Subset of `changes` on explored hexes. */
  exploredChanges: HexKey[];
}

/** Hexes the GM changed by hand in the preview. */
export type RegionAdjustments = Record<HexKey, Terrain>;

export interface RegionUndo {
  mapId: string;
  /** Each affected hex before accept; null when it had no record. */
  before: Record<HexKey, HexRecord | null>;
  /** `updatedAt` written by the accept for each affected hex. */
  stamps: Record<HexKey, number>;
}
