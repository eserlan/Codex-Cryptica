import { PRESET_TERRAIN_IDS, type TerrainId } from "../terrain";
import {
  LANDSCAPE_PRESET_IDS,
  TERRAIN_LEVELS,
  type LandscapePresetId,
  type RegionSettings,
  type TerrainLevel,
} from "./types";

export const DEFAULT_REGION_SETTINGS: RegionSettings = {
  preset: "temperate",
  levels: {},
};

/** Read stored or typed settings defensively. Never throws; unknown values fall back to the defaults. */
export function normalizeRegionSettings(raw: unknown): RegionSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { preset: "temperate", levels: {} };
  }
  const input = raw as Record<string, unknown>;
  const preset = (LANDSCAPE_PRESET_IDS as readonly unknown[]).includes(
    input.preset,
  )
    ? (input.preset as LandscapePresetId)
    : "temperate";
  const levels: RegionSettings["levels"] = {};
  const rawLevels = input.levels;
  if (rawLevels && typeof rawLevels === "object" && !Array.isArray(rawLevels)) {
    for (const [id, level] of Object.entries(
      rawLevels as Record<string, unknown>,
    )) {
      if (
        (PRESET_TERRAIN_IDS as readonly string[]).includes(id) &&
        (TERRAIN_LEVELS as readonly unknown[]).includes(level)
      ) {
        levels[id as TerrainId] = level as TerrainLevel;
      }
    }
  }
  return { preset, levels };
}

export function terrainLevel(
  settings: RegionSettings,
  id: TerrainId,
): TerrainLevel {
  return settings.levels[id] ?? "normal";
}

/** Standard terrains that can be proposed under these settings (level not "none"). */
export function availableTerrains(settings: RegionSettings): TerrainId[] {
  return PRESET_TERRAIN_IDS.filter(
    (id) => terrainLevel(settings, id) !== "none",
  );
}
