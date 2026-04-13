import type { Point, ViewportTransform } from "schema";
import type { Token } from "$types/vtt";

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
  const maxX = Math.max(0, bounds.width - tokenSize.width);
  const maxY = Math.max(0, bounds.height - tokenSize.height);
  return {
    x: Math.min(Math.max(0, point.x), maxX),
    y: Math.min(Math.max(0, point.y), maxY),
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

export function hitTestToken(
  tokens: Token[],
  project: (point: Point) => Point,
  x: number,
  y: number,
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

    if (
      x >= minX &&
      x <= maxX &&
      y >= minY &&
      y <= maxY &&
      token.zIndex >= bestZIndex
    ) {
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
