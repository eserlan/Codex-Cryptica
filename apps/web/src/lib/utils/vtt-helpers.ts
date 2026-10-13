import type { Point, ViewportTransform } from "schema";
import { isPointInHex, type HexOrientation } from "map-engine";
import type { Token, MeasurementState } from "../../types/vtt";

export function hashToColor(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 75% 55%)`;
}

export function cloneMeasurement(
  measurement: MeasurementState,
): MeasurementState {
  return {
    active: measurement.active,
    start: measurement.start ? { ...measurement.start } : null,
    end: measurement.end ? { ...measurement.end } : null,
    locked: measurement.locked,
  };
}

export function snapToGrid(
  point: Point,
  gridSize: number | null | undefined,
  offsetX = 0,
  offsetY = 0,
): Point {
  if (!gridSize || gridSize <= 0) return point;
  return {
    x: Math.round((point.x - offsetX) / gridSize) * gridSize + offsetX,
    y: Math.round((point.y - offsetY) / gridSize) * gridSize + offsetY,
  };
}

export function clampPointToBounds(
  point: Point,
  bounds: { width: number; height: number },
  tokenSize: { width: number; height: number } = { width: 0, height: 0 },
): Point {
  // Map image coordinates use the image center as (0, 0), so the valid
  // top-left range spans from the negative half-size to the positive edge.
  const minX = -bounds.width / 2;
  const minY = -bounds.height / 2;
  const maxX = Math.max(minX, bounds.width / 2 - tokenSize.width);
  const maxY = Math.max(minY, bounds.height / 2 - tokenSize.height);
  return {
    x: Math.min(Math.max(minX, point.x), maxX),
    y: Math.min(Math.max(minY, point.y), maxY),
  };
}

export function measureDistance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function projectRectToViewport(
  viewportPoint: Point,
  size: { width: number; height: number },
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
) {
  const centerX = canvasSize.width / 2 + transform.pan.x;
  const centerY = canvasSize.height / 2 + transform.pan.y;
  return {
    x: centerX + viewportPoint.x * transform.zoom,
    y: centerY + viewportPoint.y * transform.zoom,
    width: size.width * transform.zoom,
    height: size.height * transform.zoom,
  };
}

function isPointInTokenHex(
  token: Token,
  point: Point,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  gridType?: string,
): boolean {
  const orientation: HexOrientation =
    token.baseShape === "hex-flat" || gridType === "hex-flat"
      ? "flat"
      : token.baseShape === "hex-pointy" || gridType === "hex-pointy"
        ? "pointy"
        : bounds.maxX - bounds.minX > bounds.maxY - bounds.minY
          ? "flat"
          : "pointy";
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const radius = orientation === "flat" ? width / 2 : height / 2;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  // fallow-ignore-next-line code-duplication
  const radians = ((token.rotation ?? 0) * Math.PI) / 180;
  const localX = dx * Math.cos(radians) + dy * Math.sin(radians);
  const localY = -dx * Math.sin(radians) + dy * Math.cos(radians);

  return isPointInHex({ x: localX, y: localY }, radius, orientation);
}

// fallow-ignore-next-line complexity
export function hitTestToken(
  tokens: Token[],
  project: (point: Point) => Point,
  x: number,
  y: number,
  gridType?: string,
): Token | null {
  let bestHit: Token | null = null;
  let bestZIndex = -Infinity;

  for (const token of tokens) {
    const topLeft = project({ x: token.x, y: token.y });
    const bottomRight = project({
      x: token.x + token.width,
      y: token.y + token.height,
    });

    const minX = Math.min(topLeft.x, bottomRight.x);
    const maxX = Math.max(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const maxY = Math.max(topLeft.y, bottomRight.y);

    if (x < minX || x > maxX || y < minY || y > maxY) {
      continue;
    }

    const isHex =
      token.baseShape === "hex" ||
      token.baseShape === "hex-pointy" ||
      token.baseShape === "hex-flat" ||
      (token.kind === "tile" &&
        (gridType === "hex-pointy" || gridType === "hex-flat"));

    if (
      isHex &&
      !isPointInTokenHex(token, { x, y }, { minX, maxX, minY, maxY }, gridType)
    ) {
      continue;
    }

    if (token.zIndex >= bestZIndex) {
      bestHit = token;
      bestZIndex = token.zIndex;
    }
  }

  return bestHit;
}

export function getTokenCenter(token: Token): Point {
  return {
    x: token.x + token.width / 2,
    y: token.y + token.height / 2,
  };
}

export function toViewportPoint(
  point: Point,
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
): Point {
  const centerX = canvasSize.width / 2 + transform.pan.x;
  const centerY = canvasSize.height / 2 + transform.pan.y;
  return {
    x: centerX + point.x * transform.zoom,
    y: centerY + point.y * transform.zoom,
  };
}
