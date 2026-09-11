import type { Token } from "../../../types/vtt";
import type { TokenVisionMode } from "../../stores/map.svelte";

/**
 * Resolves which tokens currently drive fog-of-war reveal for the active
 * vision mode. In "selected" mode, an unmarked/NPC selection or no selection
 * at all falls back to Party Vision (the union of all vision-source tokens) —
 * the deterministic, least-surprising behavior called out in issue #2414.
 */
export function resolveVisionSourceTokens(
  tokens: Token[],
  mode: TokenVisionMode,
  selectedTokenId: string | null,
): Token[] {
  const partySources = tokens.filter((token) => token.isVisionSource === true);

  if (mode === "party") {
    return partySources;
  }

  const selected = selectedTokenId
    ? tokens.find((token) => token.id === selectedTokenId)
    : undefined;

  if (selected?.isVisionSource) {
    return [selected];
  }

  return partySources;
}

/**
 * Converts a vision range authored in grid units (e.g. 60 feet) to pixels
 * using the map's grid scale, so vision distance stays consistent with the
 * ruler regardless of how large a grid square renders on screen — e.g. 60'
 * vision on a map where each square is 5' spans 60/5 = 12 grid squares.
 */
export function visionRangeToPixels(
  visionRange: number,
  gridDistance: number,
  gridSize: number,
): number {
  if (gridDistance <= 0) return visionRange;
  return (visionRange / gridDistance) * gridSize;
}
