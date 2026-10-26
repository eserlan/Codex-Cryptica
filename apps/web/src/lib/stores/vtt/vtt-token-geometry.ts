import type { Token } from "../../../types/vtt";
import type { Point } from "schema";
import {
  getHexRange,
  hexToPoint,
  pointToHex,
  type HexGridConfig,
} from "map-engine";
import { snapToGrid, clampPointToBounds } from "#lib/utils/vtt-helpers.js";

const SQRT_3 = Math.sqrt(3);
const TOKEN_COORD_PRECISION = 2;

export function isHexShaped(shape: string | undefined) {
  return shape === "hex" || shape === "hex-pointy" || shape === "hex-flat";
}

/** Supported token sizes below one grid cell: quarter and half. */
const FRACTIONAL_CELLS = [0.25, 0.5] as const;
const FRACTION_TOLERANCE = 0.02;

/**
 * A side measured in grid cells. Beyond one cell it rounds to whole cells.
 * Below one it stays at a half or quarter cell only if it already is one, so a
 * stray in-between size still becomes a whole cell rather than a fraction.
 */
function sideInCells(cells: number): number {
  const fraction = FRACTIONAL_CELLS.find(
    (f) => Math.abs(cells - f) <= FRACTION_TOLERANCE,
  );
  return fraction ?? Math.max(1, Math.round(cells));
}

export function roundTokenCoordinate(value: number) {
  const factor = 10 ** TOKEN_COORD_PRECISION;
  return Math.round(value * factor) / factor;
}

function findBoundedHexPosition(
  targetCentre: Point,
  config: HexGridConfig,
  bounds: { width: number; height: number },
  width: number,
  height: number,
  fallback: Point,
): Point {
  const minCentreX = -bounds.width / 2 + width / 2;
  const maxCentreX = bounds.width / 2 - width / 2;
  const minCentreY = -bounds.height / 2 + height / 2;
  const maxCentreY = bounds.height / 2 - height / 2;
  const canFit = minCentreX <= maxCentreX && minCentreY <= maxCentreY;
  const searchCentre = canFit
    ? {
        x: Math.min(Math.max(targetCentre.x, minCentreX), maxCentreX),
        y: Math.min(Math.max(targetCentre.y, minCentreY), maxCentreY),
      }
    : targetCentre;
  const searchHex = pointToHex(searchCentre, config);
  const validCells = getHexRange(searchHex, 3)
    .map((hex) => ({ centre: hexToPoint(hex, config) }))
    .filter(
      ({ centre }) =>
        centre.x >= minCentreX &&
        centre.x <= maxCentreX &&
        centre.y >= minCentreY &&
        centre.y <= maxCentreY,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.centre.x - targetCentre.x, a.centre.y - targetCentre.y) -
        Math.hypot(b.centre.x - targetCentre.x, b.centre.y - targetCentre.y),
    );

  if (validCells.length === 0) {
    return clampPointToBounds(fallback, bounds, { width, height });
  }

  return {
    x: validCells[0].centre.x - width / 2,
    y: validCells[0].centre.y - height / 2,
  };
}

/** Grid alignment, map bounds and viewport coordinates for tokens. */
export class VTTTokenGeometry {
  constructor(private getMapStore: () => any) {}

  positionToken(token: Token): Token {
    const point = { x: token.x, y: token.y };
    const size = { width: token.width, height: token.height };
    const snapped =
      (token.kind === "tile" ? this.snapTileToHexCell(point, size) : null) ??
      this.clampAndSnapPosition(point, size, {
        snapToTheGrid: token.kind !== "note",
        hexShaped: isHexShaped(token.baseShape),
      });
    return { ...token, ...snapped };
  }

  /**
   * The visible hex grid, or null on a square/hidden grid. Tiles on a hex grid
   * are placed by cell, not by pixel: a hex image is not a square, so the
   * square-grid snap would both crop its points and leave it off-centre.
   */
  private hexGridConfig(): HexGridConfig | null {
    const mapStore = this.getMapStore();
    if (!mapStore.activeMap || !mapStore.showGrid) return null;
    if (
      mapStore.gridType !== "hex-flat" &&
      mapStore.gridType !== "hex-pointy"
    ) {
      return null;
    }
    return {
      orientation: mapStore.gridType === "hex-flat" ? "flat" : "pointy",
      size: mapStore.gridSize || 50,
      offsetX: mapStore.gridOffsetX || 0,
      offsetY: mapStore.gridOffsetY || 0,
    };
  }

  /**
   * Snaps a tile's centre to the centre of its hex cell. With `fitCell` the
   * box also becomes the cell's own bounding box (2R x sqrt(3)R for flat-top,
   * sqrt(3)R x 2R for pointy-top), which is exactly the box a hex tile image
   * is cut to. Returns null when the grid isn't hex.
   */
  snapTileToHexCell(
    point: Point,
    size: { width: number; height: number },
    fitCell = false,
  ): { x: number; y: number; width: number; height: number } | null {
    const mapStore = this.getMapStore();
    const config = this.hexGridConfig();
    if (!config) return null;
    const flat = config.orientation === "flat";
    const width = fitCell ? (flat ? 2 : SQRT_3) * config.size : size.width;
    const height = fitCell ? (flat ? SQRT_3 : 2) * config.size : size.height;
    const targetCentre = {
      x: point.x + size.width / 2,
      y: point.y + size.height / 2,
    };
    const targetHex = pointToHex(targetCentre, config);
    const centre = hexToPoint(targetHex, config);
    const topLeft = { x: centre.x - width / 2, y: centre.y - height / 2 };
    let bounded = topLeft;
    if (mapStore.activeMap) {
      // Clamping the box directly moves it off-grid. Near an image edge, pick
      // the closest neighbouring whole cell that fits inside the map instead.
      bounded = findBoundedHexPosition(
        targetCentre,
        config,
        mapStore.activeMap.dimensions,
        width,
        height,
        topLeft,
      );
    }
    const rounded = {
      x: roundTokenCoordinate(bounded.x),
      y: roundTokenCoordinate(bounded.y),
    };
    const finalPosition = mapStore.activeMap
      ? clampPointToBounds(rounded, mapStore.activeMap.dimensions, {
          width,
          height,
        })
      : rounded;
    return {
      x: finalPosition.x,
      y: finalPosition.y,
      width,
      height,
    };
  }

  /** Identifies the hex cell a rect's centre sits in, or null off a hex grid. */
  hexCellKey(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): string | null {
    const config = this.hexGridConfig();
    if (!config) return null;
    const { q, r } = pointToHex(
      { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      config,
    );
    return `${q},${r}`;
  }

  /**
   * Snaps a creature token on a hex grid. A token's x/y is its top-left
   * corner, so the snap works on its centre: the centre goes to the middle of
   * the hex it is over, and each side rounds to a whole number of hexes
   * (one hex is sqrt(3)R across the flats), so the smallest token fills a
   * cell instead of being a fraction of one. A hex-shaped token keeps its own
   * bounding box, which is not square.
   */
  private snapTokenToHexCell(
    point: Point,
    size: { width: number; height: number },
    config: HexGridConfig,
    keepSize: boolean,
  ): { x: number; y: number; width: number; height: number } {
    const cell = SQRT_3 * config.size;
    const whole = (side: number) => sideInCells(side / cell) * cell;
    const width = keepSize ? size.width : whole(size.width);
    const height = keepSize ? size.height : whole(size.height);
    const centre = hexToPoint(
      pointToHex(
        { x: point.x + size.width / 2, y: point.y + size.height / 2 },
        config,
      ),
      config,
    );
    return {
      x: centre.x - width / 2,
      y: centre.y - height / 2,
      width,
      height,
    };
  }

  clampAndSnapPosition(
    point: Point,
    tokenSize: { width: number; height: number },
    // Notes opt out: grid snapping exists so creatures occupy whole cells,
    // and a note is an annotation rather than something standing in a cell.
    // Snapping it would also floor it at one full cell, which a collapsed
    // note is deliberately smaller than.
    {
      snapToTheGrid = true,
      hexShaped = false,
    }: { snapToTheGrid?: boolean; hexShaped?: boolean } = {},
  ) {
    const mapStore = this.getMapStore();
    const activeMap = mapStore.activeMap;
    if (!activeMap)
      return {
        x: point.x,
        y: point.y,
        width: tokenSize.width,
        height: tokenSize.height,
      };

    let targetX = point.x;
    let targetY = point.y;
    let targetWidth = tokenSize.width;
    let targetHeight = tokenSize.height;

    const hexConfig = snapToTheGrid ? this.hexGridConfig() : null;
    if (hexConfig) {
      ({
        x: targetX,
        y: targetY,
        width: targetWidth,
        height: targetHeight,
      } = this.snapTokenToHexCell(point, tokenSize, hexConfig, hexShaped));
    } else if (mapStore.showGrid && snapToTheGrid) {
      const gridSize = mapStore.gridSize;
      const offsetX = mapStore.gridOffsetX;
      const offsetY = mapStore.gridOffsetY;

      // Snap position to grid lines
      const snapped = snapToGrid(point, gridSize, offsetX, offsetY);
      targetX = snapped.x;
      targetY = snapped.y;

      // Snap size to nearest grid cell multiple
      targetWidth = gridSize
        ? sideInCells(tokenSize.width / gridSize) * gridSize
        : tokenSize.width;
      targetHeight = gridSize
        ? sideInCells(tokenSize.height / gridSize) * gridSize
        : tokenSize.height;
    }

    // Always clamp to map bounds to prevent invisible placements
    const clamped = hexConfig
      ? findBoundedHexPosition(
          {
            x: targetX + targetWidth / 2,
            y: targetY + targetHeight / 2,
          },
          hexConfig,
          activeMap.dimensions,
          targetWidth,
          targetHeight,
          { x: targetX, y: targetY },
        )
      : clampPointToBounds({ x: targetX, y: targetY }, activeMap.dimensions, {
          width: targetWidth,
          height: targetHeight,
        });

    return {
      x: clamped.x,
      y: clamped.y,
      width: targetWidth,
      height: targetHeight,
    };
  }

  /**
   * Map coordinates at the middle of what is currently on screen. Notes
   * created from outside the map (a table roll, a toolbar button) have no
   * click position to land on, and the map origin is often scrolled out of
   * view — dropping them where the GM is already looking keeps them findable.
   */
  viewportCenterPoint(): Point {
    const mapStore = this.getMapStore();
    const canvasSize = mapStore.canvasSize;
    if (!canvasSize?.width || !canvasSize?.height) return { x: 0, y: 0 };
    const point = mapStore.unproject({
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
    });
    return {
      x: roundTokenCoordinate(point.x),
      y: roundTokenCoordinate(point.y),
    };
  }
}
