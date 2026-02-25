import type { Point, ViewportTransform } from "schema";

/**
 * Converts image-space coordinates to viewport-space coordinates.
 */
export function imageToViewport(
  point: Point,
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
): Point {
  return {
    x: point.x * transform.zoom + transform.pan.x + canvasSize.width / 2,
    y: point.y * transform.zoom + transform.pan.y + canvasSize.height / 2,
  };
}

/**
 * Converts viewport-space coordinates to image-space coordinates.
 */
export function viewportToImage(
  point: Point,
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
): Point {
  return {
    x: (point.x - transform.pan.x - canvasSize.width / 2) / transform.zoom,
    y: (point.y - transform.pan.y - canvasSize.height / 2) / transform.zoom,
  };
}
