import type { ViewportTransform } from "schema";
import { viewportToImage, imageToViewport } from "./math";
import {
  pointToHex,
  hexToPoint,
  getHexCorners,
  formatHexCoordinate,
  type HexGridConfig,
  type HexOrientation,
} from "./hex";

export interface HexGridRenderOptions {
  type: "hex" | "hex-pointy" | "hex-flat";
  size: number;
  color: string;
  opacity: number;
  offsetX?: number;
  offsetY?: number;
  fixed?: boolean;
  fixedPan?: { x: number; y: number };
  lineWidth?: number;
  showCoordinates?: boolean;
}

/**
 * Render a viewport-bounded hexagonal grid overlay onto a 2D canvas.
 */
// fallow-ignore-next-line complexity
export function drawHexGrid(
  ctx: CanvasRenderingContext2D,
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
  grid: HexGridRenderOptions,
): void {
  if (!grid || grid.size <= 0) return;

  const screenRadius = grid.size * transform.zoom;
  if (screenRadius < 3) return; // Skip subpixel or imperceptible hexes

  const orientation: HexOrientation =
    grid.type === "hex-flat" ? "flat" : "pointy";

  const effectiveTransform: ViewportTransform = grid.fixed
    ? { zoom: transform.zoom, pan: grid.fixedPan ?? { x: 0, y: 0 } }
    : transform;

  const topLeft = viewportToImage(
    { x: 0, y: 0 },
    effectiveTransform,
    canvasSize,
  );
  const topRight = viewportToImage(
    { x: canvasSize.width, y: 0 },
    effectiveTransform,
    canvasSize,
  );
  const bottomLeft = viewportToImage(
    { x: 0, y: canvasSize.height },
    effectiveTransform,
    canvasSize,
  );
  const bottomRight = viewportToImage(
    { x: canvasSize.width, y: canvasSize.height },
    effectiveTransform,
    canvasSize,
  );

  const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
  const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
  const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
  const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

  const config: HexGridConfig = {
    orientation,
    size: grid.size,
    offsetX: grid.offsetX ?? 0,
    offsetY: grid.offsetY ?? 0,
    color: grid.color,
    opacity: grid.opacity,
    lineWidth: grid.lineWidth,
    showCoordinates: grid.showCoordinates,
  };

  const c0 = pointToHex(topLeft, config);
  const c1 = pointToHex(topRight, config);
  const c2 = pointToHex(bottomLeft, config);
  const c3 = pointToHex(bottomRight, config);

  const minQ = Math.min(c0.q, c1.q, c2.q, c3.q) - 2;
  const maxQ = Math.max(c0.q, c1.q, c2.q, c3.q) + 2;
  const minR = Math.min(c0.r, c1.r, c2.r, c3.r) - 2;
  const maxR = Math.max(c0.r, c1.r, c2.r, c3.r) + 2;

  const totalCells = (maxQ - minQ + 1) * (maxR - minR + 1);
  if (totalCells > 15000) return; // Guardrail against extreme bounds

  ctx.save();
  ctx.translate(
    effectiveTransform.pan.x + canvasSize.width / 2,
    effectiveTransform.pan.y + canvasSize.height / 2,
  );
  ctx.scale(effectiveTransform.zoom, effectiveTransform.zoom);

  ctx.strokeStyle = grid.color;
  ctx.globalAlpha = grid.opacity;
  ctx.lineWidth = (grid.lineWidth ?? 1.5) / effectiveTransform.zoom;
  ctx.beginPath();

  const visibleHexes: {
    q: number;
    r: number;
    center: { x: number; y: number };
  }[] = [];
  const margin = grid.size * 2;

  for (let q = minQ; q <= maxQ; q++) {
    for (let r = minR; r <= maxR; r++) {
      const center = hexToPoint({ q, r }, config);
      if (
        center.x + margin < minX ||
        center.x - margin > maxX ||
        center.y + margin < minY ||
        center.y - margin > maxY
      ) {
        continue;
      }

      // Draw 3 non-overlapping shared edges (0->1, 1->2, 2->3)
      const corners = getHexCorners(center, grid.size, orientation);
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);

      if (grid.showCoordinates && screenRadius >= 25) {
        if (
          center.x >= minX - grid.size &&
          center.x <= maxX + grid.size &&
          center.y >= minY - grid.size &&
          center.y <= maxY + grid.size
        ) {
          visibleHexes.push({ q, r, center });
        }
      }
    }
  }

  ctx.stroke();
  ctx.restore();

  if (grid.showCoordinates && screenRadius >= 25 && visibleHexes.length > 0) {
    ctx.save();
    const fontSize = Math.min(14, Math.max(9, Math.floor(screenRadius * 0.26)));
    ctx.font = `bold ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = grid.color;
    ctx.globalAlpha = Math.min(1, grid.opacity * 1.3);

    for (const hex of visibleHexes) {
      const vp = imageToViewport(hex.center, effectiveTransform, canvasSize);
      ctx.fillText(formatHexCoordinate(hex), vp.x, vp.y);
    }
    ctx.restore();
  }
}
