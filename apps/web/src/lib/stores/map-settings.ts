import type { MapGridGeometry } from "schema";
import {
  MAP_LAYER_ORDER,
  type HexLabelConfig,
  type MapLayer,
} from "map-engine";

export type TokenVisionMode = "party" | "selected";
export type GridType = "square" | "hex-pointy" | "hex-flat";

export type PersistedMapSettings = {
  showFog: boolean;
  /** Draw fog fully opaque in GM view, as players see it (solo play). */
  soloFog: boolean;
  showGrid: boolean;
  gridType: GridType;
  showHexCoordinates: boolean;
  /** GM display preference: terrain icons on hex crawl hexes (device-local). */
  showTerrainIcons: boolean;
  hexLabelConfig?: HexLabelConfig;
  brushRadius: number;
  gridSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  gridColor: string | null;
  /** GM-chosen fog colour (#rrggbb); null means the theme colour. */
  fogColor: string | null;
  showLabels: boolean;
  visionMode: TokenVisionMode;
  /** Vision distance in grid units (e.g. feet), not pixels — converted to
   * pixels using the map's gridSize/gridDistance at reveal time. */
  visionRange: number;
  /** Per-layer view toggle and edit-lock. GM-local, not synced to guests —
   * same tier as showFog/showGrid. */
  layerVisibility: Record<MapLayer, boolean>;
  layerLocked: Record<MapLayer, boolean>;
};

const HEX_LABEL_STYLES = new Set<HexLabelConfig["style"]>([
  "none",
  "off",
  "numeric",
  "alphanumeric",
  "axial",
]);

function isPersistedHexLabelConfig(value: unknown): value is HexLabelConfig {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const style = (value as Record<string, unknown>).style;
  return (
    typeof style === "string" &&
    HEX_LABEL_STYLES.has(style as HexLabelConfig["style"])
  );
}

export function layerRecord<T>(value: T): Record<MapLayer, T> {
  return Object.fromEntries(
    MAP_LAYER_ORDER.map((layer) => [layer, value]),
  ) as Record<MapLayer, T>;
}

export const DEFAULT_MAP_SETTINGS: PersistedMapSettings = {
  showFog: false,
  soloFog: false,
  showGrid: false,
  gridType: "square",
  showHexCoordinates: false,
  showTerrainIcons: false,
  hexLabelConfig: { style: "none" },
  brushRadius: 50,
  gridSize: 50,
  gridOffsetX: 0,
  gridOffsetY: 0,
  gridColor: null,
  fogColor: null,
  showLabels: true,
  visionMode: "party",
  visionRange: 60,
  layerVisibility: layerRecord(true),
  layerLocked: layerRecord(false),
};

/**
 * The grid fields to show: the map's stored geometry where it has one, else this
 * device's persisted settings, else the defaults (FR-037).
 */
export function gridFieldsFor(
  geometry: MapGridGeometry | null,
  next: PersistedMapSettings,
) {
  if (!geometry) return deviceGridFields(next);
  return {
    gridType: geometry.type,
    gridSize: geometry.size,
    gridOffsetX: geometry.offsetX,
    gridOffsetY: geometry.offsetY,
    hexLabelConfig: geometry.labels ?? deviceLabels(next),
  };
}

function deviceGridFields(next: PersistedMapSettings) {
  return {
    gridType: next.gridType,
    gridSize: next.gridSize,
    gridOffsetX: next.gridOffsetX ?? 0,
    gridOffsetY: next.gridOffsetY ?? 0,
    hexLabelConfig: deviceLabels(next),
  };
}

function deviceLabels(next: PersistedMapSettings): HexLabelConfig {
  return (
    next.hexLabelConfig ?? {
      style: next.showHexCoordinates ? "numeric" : "none",
    }
  );
}

function settingOrDefault<T extends boolean | number>(
  value: unknown,
  fallback: T,
): T {
  return typeof value === typeof fallback ? (value as T) : fallback;
}

function nullableColor(value: unknown, fallback: string | null): string | null {
  return typeof value === "string" || value === null ? value : fallback;
}

function mergeLayers(value: unknown, fallback: Record<MapLayer, boolean>) {
  return value && typeof value === "object"
    ? { ...fallback, ...value }
    : fallback;
}

/** Reads old device settings without discarding fields introduced since they were saved. */
export function parseMapSettings(raw: string): PersistedMapSettings | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedMapSettings>;
    return {
      showFog: settingOrDefault(parsed.showFog, DEFAULT_MAP_SETTINGS.showFog),
      soloFog: settingOrDefault(parsed.soloFog, DEFAULT_MAP_SETTINGS.soloFog),
      showGrid: settingOrDefault(
        parsed.showGrid,
        DEFAULT_MAP_SETTINGS.showGrid,
      ),
      gridType:
        parsed.gridType === "hex-pointy" ||
        parsed.gridType === "hex-flat" ||
        parsed.gridType === "square"
          ? parsed.gridType
          : DEFAULT_MAP_SETTINGS.gridType,
      showHexCoordinates: settingOrDefault(
        parsed.showHexCoordinates,
        DEFAULT_MAP_SETTINGS.showHexCoordinates,
      ),
      showTerrainIcons: settingOrDefault(
        parsed.showTerrainIcons,
        DEFAULT_MAP_SETTINGS.showTerrainIcons,
      ),
      hexLabelConfig: isPersistedHexLabelConfig(parsed.hexLabelConfig)
        ? parsed.hexLabelConfig
        : {
            style:
              typeof parsed.showHexCoordinates === "boolean" &&
              parsed.showHexCoordinates
                ? "numeric"
                : "none",
          },
      brushRadius: settingOrDefault(
        parsed.brushRadius,
        DEFAULT_MAP_SETTINGS.brushRadius,
      ),
      gridSize: settingOrDefault(
        parsed.gridSize,
        DEFAULT_MAP_SETTINGS.gridSize,
      ),
      gridOffsetX: settingOrDefault(
        parsed.gridOffsetX,
        DEFAULT_MAP_SETTINGS.gridOffsetX,
      ),
      gridOffsetY: settingOrDefault(
        parsed.gridOffsetY,
        DEFAULT_MAP_SETTINGS.gridOffsetY,
      ),
      gridColor: nullableColor(
        parsed.gridColor,
        DEFAULT_MAP_SETTINGS.gridColor,
      ),
      fogColor: nullableColor(parsed.fogColor, DEFAULT_MAP_SETTINGS.fogColor),
      showLabels: settingOrDefault(
        parsed.showLabels,
        DEFAULT_MAP_SETTINGS.showLabels,
      ),
      visionMode:
        parsed.visionMode === "party" || parsed.visionMode === "selected"
          ? parsed.visionMode
          : DEFAULT_MAP_SETTINGS.visionMode,
      visionRange: settingOrDefault(
        parsed.visionRange,
        DEFAULT_MAP_SETTINGS.visionRange,
      ),
      // Spread-merged over defaults (not a bare typeof check) so an old
      // persisted blob missing a since-added layer doesn't produce
      // `undefined` for it.
      layerVisibility: mergeLayers(
        parsed.layerVisibility,
        DEFAULT_MAP_SETTINGS.layerVisibility,
      ),
      layerLocked: mergeLayers(
        parsed.layerLocked,
        DEFAULT_MAP_SETTINGS.layerLocked,
      ),
    };
  } catch {
    return null;
  }
}
