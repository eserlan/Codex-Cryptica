import type { Point } from "schema";

export const TOKEN_ROTATION_HANDLE_DISTANCE = 18;
export const TOKEN_ROTATION_HANDLE_RADIUS = 14;
export const TOKEN_ROTATION_STEP = 45;

export function normalizeTokenRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

export function snapTokenRotation(rotation: number): number {
  return normalizeTokenRotation(
    Math.round(rotation / TOKEN_ROTATION_STEP) * TOKEN_ROTATION_STEP,
  );
}

export function getTokenCenter(token: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Point {
  return {
    x: token.x + token.width / 2,
    y: token.y + token.height / 2,
  };
}

export function getTokenRotationHandlePosition(token: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Point {
  const center = getTokenCenter(token);
  return {
    x: center.x,
    y:
      center.y -
      Math.max(token.width, token.height) / 2 -
      TOKEN_ROTATION_HANDLE_DISTANCE,
  };
}

export function rotationFromPoint(center: Point, point: Point): number {
  return normalizeTokenRotation(
    (Math.atan2(point.x - center.x, center.y - point.y) * 180) / Math.PI,
  );
}
