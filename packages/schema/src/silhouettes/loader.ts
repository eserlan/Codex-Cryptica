import type { SilhouetteDefinition } from "./types";

/** Where the silhouette artwork lives. */
export const SILHOUETTE_ASSET_BASE = "https://assets.codexcryptica.com/";

/** Fallback tint for callers with no theme to hand. */
export const DEFAULT_SILHOUETTE_FILL = "#d4af37";

/**
 * Cache generation for the artwork URLs.
 *
 * The CDN in front of the bucket does not vary its cache on `Origin`, so one
 * request made without that header — a crawler, a `curl`, an `<img>` — caches a
 * response carrying no `Access-Control-Allow-Origin`, and every browser `fetch`
 * for that URL then fails CORS until the entry expires. That is what left a
 * scattered handful of silhouettes blank while their neighbours loaded.
 *
 * Requesting a generation-stamped URL sidesteps any such entry, and gives us a
 * way to force a refetch when artwork is republished. Bump it when the assets
 * in R2 change.
 */
export const SILHOUETTE_ASSET_VERSION = "2";

/**
 * URL the app fetches a silhouette from. `bare` gives the plain address for
 * showing or sharing (the public gallery's "copy CDN link"), without the
 * cache generation.
 */
export function getSilhouetteUrl(
  silhouette: Pick<SilhouetteDefinition, "r2Path">,
  base = SILHOUETTE_ASSET_BASE,
  { bare = false }: { bare?: boolean } = {},
): string {
  const url = `${base}${silhouette.r2Path}`;
  return bare ? url : `${url}?v=${SILHOUETTE_ASSET_VERSION}`;
}

/**
 * Recolours a silhouette. Every asset paints with `currentColor`, which an SVG
 * loaded as an image cannot inherit from the page — so the colour is
 * substituted into the markup before it is handed to an `<img>` or a canvas.
 */
export function tintSilhouetteSvg(svg: string, fillColor: string): string {
  return svg.replace(/currentColor/g, fillColor);
}

/** Turns SVG markup into a data URI usable as a canvas or CSS background. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface SilhouetteFetchOptions {
  /** Injectable for tests and non-browser callers. */
  fetch?: typeof globalThis.fetch;
  base?: string;
}

/**
 * In-flight and completed fetches, keyed by URL. Silhouettes are immutable
 * artwork, so one fetch per URL per session is enough, and concurrent callers
 * (a graph full of nodes, a picker full of tiles) share it. Failures are not
 * cached, so going offline and back does not poison the catalogue.
 */
const svgCache = new Map<string, Promise<string>>();

/** Drops the session cache. Test seam; also useful after a failed load. */
export function clearSilhouetteCache(): void {
  svgCache.clear();
}

/**
 * Fetches a silhouette's markup from R2, or null when it cannot be reached —
 * the artwork is decorative, so callers degrade to no glyph rather than to an
 * error state.
 */
export async function loadSilhouetteSvg(
  silhouette: Pick<SilhouetteDefinition, "r2Path">,
  options: SilhouetteFetchOptions = {},
): Promise<string | null> {
  const url = getSilhouetteUrl(
    silhouette,
    options.base ?? SILHOUETTE_ASSET_BASE,
  );
  const cached = svgCache.get(url);
  if (cached) return cached.catch(() => null);

  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) return null;

  const pending = (async () => {
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Silhouette ${url} responded ${response.status}`);
    }
    return await response.text();
  })();

  svgCache.set(url, pending);

  try {
    return await pending;
  } catch {
    svgCache.delete(url);
    return null;
  }
}

/**
 * Fetches a silhouette and returns it tinted, as a data URI ready for a
 * cytoscape node background or a CSS background-image. Null when the artwork
 * could not be fetched.
 */
export async function loadSilhouetteDataUri(
  silhouette: Pick<SilhouetteDefinition, "r2Path">,
  fillColor = DEFAULT_SILHOUETTE_FILL,
  options: SilhouetteFetchOptions = {},
): Promise<string | null> {
  const svg = await loadSilhouetteSvg(silhouette, options);
  return svg === null ? null : svgToDataUri(tintSilhouetteSvg(svg, fillColor));
}
