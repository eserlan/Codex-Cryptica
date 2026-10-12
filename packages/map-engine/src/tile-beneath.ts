import type { Point } from "schema";
import { getTokenCenter } from "./token-geometry";
import { mapLayerRank, normalizeMapLayer } from "./layers";
import type { Token } from "./vtt";

/**
 * The tile a token is standing on, judged from the token's centre.
 *
 * Hex tiles are placed as rectangles, so neighbouring tiles' bounding boxes
 * overlap at the corners. Among every tile whose box holds the point, the
 * one with the nearest centre is the one the point is actually inside: on a
 * regular hex grid the nearest-centre region of each cell is that hex. Ties
 * go to the tile drawn on top (higher layer, then higher z-index).
 *
 * Returns null when the token stands on bare map, or isn't standing anywhere
 * meaningful (a tile or a note is never "on" a tile for this purpose).
 */
export function findTileBeneath(
  token: Token,
  tokens: Iterable<Token>,
): Token | null {
  if (token.kind === "tile" || token.kind === "note") return null;
  return findTileAtPoint(getTokenCenter(token), tokens, token.id);
}

export function findTileAtPoint(
  point: Point,
  tokens: Iterable<Token>,
  excludeId?: string,
): Token | null {
  let best: Token | null = null;
  let bestDistance = Infinity;

  for (const candidate of tokens) {
    if (candidate.kind !== "tile" || candidate.id === excludeId) continue;
    const center = getTokenCenter(candidate);
    const radians = (candidate.rotation * Math.PI) / 180;
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    // The canvas rotates tiles around their centre. Undo that rotation before
    // checking their local rectangle, so the lookup matches the rendered tile.
    const localX = dx * Math.cos(radians) + dy * Math.sin(radians);
    const localY = -dx * Math.sin(radians) + dy * Math.cos(radians);
    if (
      Math.abs(localX) > Math.abs(candidate.width) / 2 ||
      Math.abs(localY) > Math.abs(candidate.height) / 2
    ) {
      continue;
    }

    const distance = Math.hypot(point.x - center.x, point.y - center.y);
    if (
      distance < bestDistance ||
      (distance === bestDistance && best && drawsAbove(candidate, best))
    ) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}

function drawsAbove(a: Token, b: Token): boolean {
  const rankA = mapLayerRank(normalizeMapLayer(a.layer, a.kind));
  const rankB = mapLayerRank(normalizeMapLayer(b.layer, b.kind));
  if (rankA !== rankB) return rankA > rankB;
  return a.zIndex > b.zIndex;
}
