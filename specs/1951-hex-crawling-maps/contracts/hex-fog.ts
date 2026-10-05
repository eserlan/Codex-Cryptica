/**
 * Contract: Hex Fog of War Operations
 * Location: apps/web/src/lib/components/map/hex-fog-stroke.ts
 */

import type { HexCoord, HexGridConfig } from "map-engine";

/**
 * Punch a single hexagonal cell into the 2D fog mask canvas.
 * @param ctx - Context of maskCanvas
 * @param hex - Target hex coordinate
 * @param config - Hex grid configuration
 * @param isHiding - True to restore fog (destination-out), false to reveal (source-over white)
 */
export declare function punchHexFogCell(
  ctx: CanvasRenderingContext2D,
  hex: HexCoord,
  config: HexGridConfig,
  isHiding: boolean,
): void;

/**
 * Punch a circular radius of hex cells into the 2D fog mask canvas.
 * @param ctx - Context of maskCanvas
 * @param centerHex - Center hex coordinate
 * @param radiusInHexes - Distance in hex steps (e.g. 1 or 2)
 * @param config - Hex grid configuration
 * @param isHiding - True to restore fog, false to reveal
 */
export declare function punchHexFogRadius(
  ctx: CanvasRenderingContext2D,
  centerHex: HexCoord,
  radiusInHexes: number,
  config: HexGridConfig,
  isHiding: boolean,
): void;
