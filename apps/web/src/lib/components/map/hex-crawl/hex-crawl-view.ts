import {
  formatHexLabel,
  type HexCoord,
  type HexGridConfig,
  type HexLabelConfig,
  type HexOrientation,
} from "map-engine";

/** Who may see any hex crawl UI (FR-041). Player View previews count as players. */
export interface HexCrawlAccess {
  isGM: boolean;
  isGuest: boolean;
}

export function canSeeHexCrawl(access: HexCrawlAccess): boolean {
  return access.isGM && !access.isGuest;
}

export function isHexGridType(gridType: string): boolean {
  return gridType === "hex-pointy" || gridType === "hex-flat";
}

export interface HexGridFields {
  gridType: string;
  gridSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
}

/** The map's grid, as the hex maths in map-engine expects it. */
export function hexGridConfigFor(grid: HexGridFields): HexGridConfig {
  return {
    orientation: grid.gridType === "hex-flat" ? "flat" : "pointy",
    size: grid.gridSize,
    offsetX: grid.gridOffsetX,
    offsetY: grid.gridOffsetY,
  };
}

/**
 * The grid the hex crawl works on. Unlike the fog helper, this does not depend on
 * whether grid lines are drawn: hiding the lines must not switch off hex crawl
 * or stop exploration being recorded. Null when the map is not a hex grid.
 */
export function activeHexGridConfig(grid: HexGridFields): HexGridConfig | null {
  return isHexGridType(grid.gridType) ? hexGridConfigFor(grid) : null;
}

/**
 * The hex's label in the map's own style. When labels are hidden or unset,
 * the default numeric format is used, so a hex can always be named (FR-003c).
 */
export function hexLabelFor(
  hex: HexCoord,
  labelConfig: HexLabelConfig | undefined,
  orientation: HexOrientation,
): string {
  const style = labelConfig?.style;
  if (!labelConfig || style === "none" || style === "off") {
    return formatHexLabel(hex, { style: "numeric" }, orientation);
  }
  return formatHexLabel(hex, labelConfig, orientation);
}
