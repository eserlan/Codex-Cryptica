/** Fixed render/stacking order: terrain sits at the bottom, tokens always on
 * top. Furniture/objects sit between the two. */
export const MAP_LAYER_ORDER = ["terrain", "object", "token"] as const;

export type MapLayer = (typeof MAP_LAYER_ORDER)[number];

export function mapLayerRank(layer: MapLayer): number {
  return MAP_LAYER_ORDER.indexOf(layer);
}

/**
 * Legacy tokens (saved before layers existed) have no `layer` field. Default
 * them from `kind` so existing maps keep rendering exactly as before: tile-
 * deck art becomes terrain, everything else becomes a token.
 */
export function normalizeMapLayer(
  value: unknown,
  fallbackKind?: "token" | "tile",
): MapLayer {
  if ((MAP_LAYER_ORDER as readonly string[]).includes(value as string)) {
    return value as MapLayer;
  }
  return fallbackKind === "tile" ? "terrain" : "token";
}

/**
 * Shared "next z-index" scan, scoped to whatever iterable of same-layer
 * tokens the caller passes in — bring-to-front/send-to-back/clone/tile-
 * placement all need "top of my own layer," not top of the whole map.
 */
export function nextZIndexInLayer(
  tokensInLayer: Iterable<{ zIndex: number }>,
): number {
  let max = -1;
  for (const token of tokensInLayer) {
    if (Number.isFinite(token.zIndex)) max = Math.max(max, token.zIndex);
  }
  return max + 1;
}
