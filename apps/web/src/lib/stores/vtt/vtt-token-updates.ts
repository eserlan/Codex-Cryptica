import type { Token, TokenStateUpdateInput } from "../../../types/vtt";
import { normalizeTokenRotation, normalizeTokenVisibility } from "map-engine";
import { snapToNeighborTiles } from "@codex/spatial-engine";
import {
  VTTTokenGeometry,
  isHexShaped,
  roundTokenCoordinate,
} from "./vtt-token-geometry";

export function tokenPositionChanged(updates: TokenStateUpdateInput) {
  return updates.x !== undefined || updates.y !== undefined;
}

export function tokenGeometryChanged(updates: TokenStateUpdateInput) {
  return (
    tokenPositionChanged(updates) ||
    updates.width !== undefined ||
    updates.height !== undefined
  );
}

function neighboringTiles(tokens: Record<string, Token>, tokenId: string) {
  const neighbors: Token[] = [];
  for (const key in tokens) {
    if (!Object.prototype.hasOwnProperty.call(tokens, key)) continue;
    const token = tokens[key];
    if (token.kind === "tile" && token.id !== tokenId) neighbors.push(token);
  }
  return neighbors;
}

function requestedPlacement(current: Token, updates: TokenStateUpdateInput) {
  const point = {
    x: updates.x !== undefined ? roundTokenCoordinate(updates.x) : current.x,
    y: updates.y !== undefined ? roundTokenCoordinate(updates.y) : current.y,
  };
  const size = {
    width: updates.width ?? current.width,
    height: updates.height ?? current.height,
  };
  return { point, size };
}

function updatedPlacement(
  tokenId: string,
  current: Token,
  updates: TokenStateUpdateInput,
  tokens: Record<string, Token>,
  geometry: VTTTokenGeometry,
) {
  if (!tokenGeometryChanged(updates)) {
    return {
      x: current.x,
      y: current.y,
      width: current.width,
      height: current.height,
    };
  }
  const { point, size } = requestedPlacement(current, updates);
  const hexSnapped =
    current.kind === "tile" ? geometry.snapTileToHexCell(point, size) : null;
  const snapped =
    hexSnapped ??
    geometry.clampAndSnapPosition(point, size, {
      snapToTheGrid: current.kind !== "note",
      hexShaped: isHexShaped(current.baseShape),
    });
  // Hex tiles already align by cell. Other tiles also align to nearby edges.
  if (current.kind === "tile" && !hexSnapped) {
    const tileSnapped = snapToNeighborTiles(
      snapped,
      neighboringTiles(tokens, tokenId),
      Math.max(12, snapped.width * 0.12),
    );
    snapped.x = tileSnapped.x;
    snapped.y = tileSnapped.y;
  }
  return snapped;
}

export function updatedToken(
  tokenId: string,
  current: Token,
  updates: TokenStateUpdateInput,
  tokens: Record<string, Token>,
  geometry: VTTTokenGeometry,
): Token {
  const snapped = updatedPlacement(tokenId, current, updates, tokens, geometry);
  return {
    ...current,
    ...updates,
    visibleTo:
      updates.visibleTo !== undefined
        ? normalizeTokenVisibility(updates.visibleTo)
        : current.visibleTo,
    ...snapped,
    rotation:
      updates.rotation !== undefined
        ? normalizeTokenRotation(updates.rotation)
        : current.rotation,
  };
}

/** Move only direct children, after the parent has been installed in reactive state. */
export function moveLinkedTokens(
  tokens: Record<string, Token>,
  tokenId: string,
  previous: Token,
  next: Token,
  updates: TokenStateUpdateInput,
) {
  if (
    !tokenPositionChanged(updates) ||
    (next.x === previous.x && next.y === previous.y)
  )
    return;
  const dx = next.x - previous.x;
  const dy = next.y - previous.y;
  for (const childId in tokens) {
    const child = tokens[childId];
    if (child && child.parentTokenId === tokenId) {
      tokens[childId] = {
        ...child,
        x: roundTokenCoordinate(child.x + dx),
        y: roundTokenCoordinate(child.y + dy),
      };
    }
  }
}
