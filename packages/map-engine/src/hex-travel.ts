import type { Point } from "schema";
import { getHexRange, hexDistance, pointToHex } from "./hex";
import type { HexCoord, HexGridConfig } from "./hex";

export function hexTravel(
  from: Point,
  to: Point,
  config: HexGridConfig,
): { from: HexCoord; to: HexCoord; hexes: number } {
  const fromHex = pointToHex(from, config);
  const toHex = pointToHex(to, config);
  return { from: fromHex, to: toHex, hexes: hexDistance(fromHex, toHex) };
}

export function visionRangeInHexes(
  visionRange: number,
  gridDistance: number,
): number {
  if (
    !Number.isFinite(visionRange) ||
    !Number.isFinite(gridDistance) ||
    gridDistance <= 0
  )
    return 0;
  return Math.max(0, Math.round(visionRange / gridDistance));
}

export function newlyRevealedHexes(
  center: HexCoord,
  radius: number,
  isRevealed: (hex: HexCoord) => boolean,
): HexCoord[] {
  return getHexRange(center, Math.max(0, Math.floor(radius))).filter(
    (hex) => !isRevealed(hex),
  );
}
