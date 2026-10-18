/**
 * Contract: Hexagonal Geometry & Engine APIs
 * Location: packages/map-engine/src/hex.ts
 */

import type { Point } from "schema";

// fallow-ignore-next-line code-duplication
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
  size: number; // outer radius in pixels
  offsetX: number;
  offsetY: number;
  color?: string;
  opacity?: number;
  lineWidth?: number;
  showCoordinates?: boolean;
}

/** Convert axial coordinates to 3D cube coordinates. */
export declare function axialToCube(hex: HexCoord): CubeCoord;

/** Convert 3D cube coordinates to 2D axial coordinates. */
export declare function cubeToAxial(cube: CubeCoord): HexCoord;

/** Calculate discrete hex distance between two axial coordinates. */
export declare function hexDistance(a: HexCoord, b: HexCoord): number;

/** Round fractional cube coordinates to the nearest discrete integer cube coordinate. */
export declare function cubeRound(cube: {
  x: number;
  y: number;
  z: number;
}): CubeCoord;

/** Convert pixel/image coordinates to the nearest discrete axial hex coordinate. */
export declare function pointToHex(
  point: Point,
  config: HexGridConfig,
): HexCoord;

/** Convert discrete axial hex coordinate to its center point in pixel/image coordinates. */
export declare function hexToPoint(hex: HexCoord, config: HexGridConfig): Point;

/** Return the 6 polygon corner vertices of a hex in image coordinates. */
export declare function getHexCorners(
  center: Point,
  size: number,
  orientation: HexOrientation,
): Point[];

/** Return all 6 adjacent axial neighbor coordinates for a hex. */
export declare function getHexNeighbors(hex: HexCoord): HexCoord[];

/** Return all axial hex coordinates within `radius` steps from `center`. */
export declare function getHexRange(
  center: HexCoord,
  radius: number,
): HexCoord[];

/** Calculate the optimal line of hex coordinates between `from` and `to` using linear interpolation. */
export declare function getHexLine(from: HexCoord, to: HexCoord): HexCoord[];

/** Snap a pixel point to the center of the nearest hex cell. */
export declare function snapPointToHexCenter(
  point: Point,
  config: HexGridConfig,
): Point;

/** Format axial coordinate for label display (e.g. "01.04" or "-02.+03"). */
export declare function formatHexCoordinate(hex: HexCoord): string;
