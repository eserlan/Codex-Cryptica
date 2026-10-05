import type { Point } from "schema";

export interface HexCoord {
  readonly q: number;
  readonly r: number;
}

export interface CubeCoord {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type HexOrientation = "pointy" | "flat";

export interface HexGridConfig {
  orientation: HexOrientation;
  size: number; // outer radius (center to corner vertex) in pixels
  offsetX: number;
  offsetY: number;
  color?: string;
  opacity?: number;
  lineWidth?: number;
  showCoordinates?: boolean;
}

const SQRT_3 = Math.sqrt(3);

/**
 * Convert axial coordinate (q, r) to 3D cube coordinate (x, y, z) where x + y + z = 0.
 */
export function axialToCube(hex: HexCoord): CubeCoord {
  const x = hex.q;
  const z = hex.r;
  const y = -x - z;
  return { x, y, z };
}

/**
 * Convert 3D cube coordinate (x, y, z) to 2D axial coordinate (q, r).
 */
export function cubeToAxial(cube: CubeCoord): HexCoord {
  return {
    q: cube.x === 0 ? 0 : cube.x,
    r: cube.z === 0 ? 0 : cube.z,
  };
}

/**
 * Round fractional cube coordinates to the nearest discrete integer cube coordinates,
 * ensuring x + y + z = 0 constraint is strictly preserved.
 */
export function cubeRound(cube: {
  x: number;
  y: number;
  z: number;
}): CubeCoord {
  let rx = Math.round(cube.x);
  let ry = Math.round(cube.y);
  let rz = Math.round(cube.z);

  const xDiff = Math.abs(rx - cube.x);
  const yDiff = Math.abs(ry - cube.y);
  const zDiff = Math.abs(rz - cube.z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return {
    x: rx === 0 ? 0 : rx,
    y: ry === 0 ? 0 : ry,
    z: rz === 0 ? 0 : rz,
  };
}

/**
 * Convert discrete axial hex coordinate to its center point in pixel/image coordinates.
 */
export function hexToPoint(hex: HexCoord, config: HexGridConfig): Point {
  const { orientation, size, offsetX, offsetY } = config;
  if (orientation === "pointy") {
    const x = size * (SQRT_3 * hex.q + (SQRT_3 / 2) * hex.r) + offsetX;
    const y = size * ((3 / 2) * hex.r) + offsetY;
    return { x, y };
  } else {
    const x = size * ((3 / 2) * hex.q) + offsetX;
    const y = size * ((SQRT_3 / 2) * hex.q + SQRT_3 * hex.r) + offsetY;
    return { x, y };
  }
}

/**
 * Convert pixel/image coordinates to the nearest discrete axial hex coordinate.
 */
export function pointToHex(point: Point, config: HexGridConfig): HexCoord {
  const { orientation, size, offsetX, offsetY } = config;
  const px = point.x - offsetX;
  const py = point.y - offsetY;

  let fracQ: number;
  let fracR: number;

  if (orientation === "pointy") {
    fracQ = ((SQRT_3 / 3) * px - (1 / 3) * py) / size;
    fracR = ((2 / 3) * py) / size;
  } else {
    fracQ = ((2 / 3) * px) / size;
    fracR = (-(1 / 3) * px + (SQRT_3 / 3) * py) / size;
  }

  const fracCube = {
    x: fracQ,
    y: -fracQ - fracR,
    z: fracR,
  };

  const rounded = cubeRound(fracCube);
  return cubeToAxial(rounded);
}

/**
 * Calculate discrete hex distance between two axial coordinates.
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return Math.max(
    Math.abs(ac.x - bc.x),
    Math.abs(ac.y - bc.y),
    Math.abs(ac.z - bc.z),
  );
}

/**
 * Return all 6 adjacent axial neighbor coordinates for a hex.
 */
export function getHexNeighbors(hex: HexCoord): HexCoord[] {
  const directions: HexCoord[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];
  return directions.map((dir) => ({ q: hex.q + dir.q, r: hex.r + dir.r }));
}

/**
 * Return all axial hex coordinates within `radius` steps from `center`.
 */
export function getHexRange(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }
  return results;
}

/**
 * Return the 6 polygon corner vertices of a hex in image coordinates.
 */
export function getHexCorners(
  center: Point,
  size: number,
  orientation: HexOrientation,
): Point[] {
  const corners: Point[] = [];
  const startAngleDeg = orientation === "pointy" ? 30 : 0;

  for (let i = 0; i < 6; i++) {
    const angleRad = ((60 * i + startAngleDeg) * Math.PI) / 180;
    corners.push({
      x: center.x + size * Math.cos(angleRad),
      y: center.y + size * Math.sin(angleRad),
    });
  }

  return corners;
}

/**
 * Interpolate linear coordinates between two cube coordinates.
 */
function cubeLerp(
  a: CubeCoord,
  b: CubeCoord,
  t: number,
): { x: number; y: number; z: number } {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

/**
 * Calculate the line of hex coordinates between `from` and `to` using linear interpolation.
 */
export function getHexLine(from: HexCoord, to: HexCoord): HexCoord[] {
  const n = hexDistance(from, to);
  if (n === 0) return [from];

  const ac = axialToCube(from);
  const bc = axialToCube(to);
  const results: HexCoord[] = [];

  // Add small nudge to avoid precision issues on boundary lines
  const acNudge = { x: ac.x + 1e-6, y: ac.y + 1e-6, z: ac.z - 2e-6 };
  const bcNudge = { x: bc.x + 1e-6, y: bc.y + 1e-6, z: bc.z - 2e-6 };

  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const lerped = cubeLerp(acNudge, bcNudge, t);
    results.push(cubeToAxial(cubeRound(lerped)));
  }

  return results;
}

/**
 * Snap a pixel point to the center of the nearest hex cell.
 */
export function snapPointToHexCenter(
  point: Point,
  config: HexGridConfig,
): Point {
  const hex = pointToHex(point, config);
  return hexToPoint(hex, config);
}

/**
 * Format axial coordinate for label display (e.g. "01.04" or "-02.05").
 */
export function formatHexCoordinate(hex: HexCoord): string {
  const formatComponent = (val: number): string => {
    const sign = val < 0 ? "-" : "";
    const abs = Math.abs(val);
    const padded = abs < 10 ? `0${abs}` : `${abs}`;
    return `${sign}${padded}`;
  };
  return `${formatComponent(hex.q)}.${formatComponent(hex.r)}`;
}
