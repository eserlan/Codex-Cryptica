import type { HexCoord, HexGridConfig } from "map-engine";
import { hexToPoint, getHexCorners, getHexRange } from "map-engine";

function traceHexCorners(
  ctx: CanvasRenderingContext2D,
  corners: { x: number; y: number }[],
  offsetX: number,
  offsetY: number,
): void {
  ctx.moveTo(corners[0].x + offsetX, corners[0].y + offsetY);
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(corners[i].x + offsetX, corners[i].y + offsetY);
  }
  ctx.closePath();
}

/**
 * Return HexGridConfig if the given map store has an active hex grid, or null otherwise.
 */
export function getActiveHexConfig(mapStore: {
  showGrid?: boolean;
  gridType?: string;
  gridSize?: number;
  gridOffsetX?: number;
  gridOffsetY?: number;
}): HexGridConfig | null {
  if (
    mapStore.showGrid &&
    (mapStore.gridType === "hex-pointy" || mapStore.gridType === "hex-flat")
  ) {
    return {
      orientation: mapStore.gridType === "hex-flat" ? "flat" : "pointy",
      size: mapStore.gridSize || 50,
      offsetX: mapStore.gridOffsetX || 0,
      offsetY: mapStore.gridOffsetY || 0,
    };
  }
  return null;
}

/**
 * Punch a single hexagonal cell into the 2D fog mask canvas.
 */
export function punchHexFogCell(
  ctx: CanvasRenderingContext2D,
  maskSize: { width: number; height: number },
  hex: HexCoord,
  config: HexGridConfig,
  isHiding: boolean,
): void {
  ctx.save();
  if (isHiding) {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.fillStyle = "white";
    ctx.globalCompositeOperation = "source-over";
  }

  const center = hexToPoint(hex, config);
  const corners = getHexCorners(center, config.size, config.orientation);
  const offsetX = maskSize.width / 2;
  const offsetY = maskSize.height / 2;

  ctx.beginPath();
  traceHexCorners(ctx, corners, offsetX, offsetY);
  ctx.fill();

  ctx.restore();
}

/**
 * Punch a radius of hex cells into the 2D fog mask canvas.
 */
export function punchHexFogRadius(
  ctx: CanvasRenderingContext2D,
  maskSize: { width: number; height: number },
  centerHex: HexCoord,
  radiusInHexes: number,
  config: HexGridConfig,
  isHiding: boolean,
): void {
  const hexes = getHexRange(centerHex, radiusInHexes);
  ctx.save();
  if (isHiding) {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.fillStyle = "white";
    ctx.globalCompositeOperation = "source-over";
  }

  const offsetX = maskSize.width / 2;
  const offsetY = maskSize.height / 2;

  ctx.beginPath();
  for (const hex of hexes) {
    const center = hexToPoint(hex, config);
    const corners = getHexCorners(center, config.size, config.orientation);
    traceHexCorners(ctx, corners, offsetX, offsetY);
  }
  ctx.fill();

  ctx.restore();
}
