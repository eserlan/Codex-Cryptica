import type { Point, ViewportTransform } from "schema";

/**
 * Converts image-space coordinates to viewport-space coordinates.
 */
export function imageToViewport(
  point: Point,
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
  target?: Point,
): Point {
  const out = target || { x: 0, y: 0 };
  out.x = point.x * transform.zoom + transform.pan.x + canvasSize.width / 2;
  out.y = point.y * transform.zoom + transform.pan.y + canvasSize.height / 2;
  return out;
}

/**
 * Converts viewport-space coordinates to image-space coordinates.
 */
export function viewportToImage(
  point: Point,
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
  target?: Point,
): Point {
  const out = target || { x: 0, y: 0 };
  out.x = (point.x - transform.pan.x - canvasSize.width / 2) / transform.zoom;
  out.y = (point.y - transform.pan.y - canvasSize.height / 2) / transform.zoom;
  return out;
}
