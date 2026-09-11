/**
 * Content Cluster Route Resolution for Server-Side Observability (#2864).
 *
 * Resolves cleaned request paths against the Discovery Intent Registry and
 * canonical content graph without inferring free-form values from titles or regexes.
 */

import {
  getDiscoveryEntries,
  getEntryClusters,
} from "../../content/discovery/registry";
import type { DiscoveryEntry } from "../../content/discovery/schema";
import { isContentClusterSlug } from "../../content/labels";

export interface PathClusterMetadata {
  primaryContentCluster: string | null;
  contentClusters: string[];
}

let cachedRouteClusterMap: Map<string, PathClusterMetadata> | null = null;

/**
 * Normalise a pathname for route matching:
 * - ensures root-relative leading slash
 * - removes query strings and fragments
 * - removes trailing slash (except for `/`)
 * - lowercases
 */
export function normalizePath(rawPathOrUrl: string): string {
  if (!rawPathOrUrl) return "/";

  let pathname: string;
  try {
    if (rawPathOrUrl.includes("://")) {
      pathname = new URL(rawPathOrUrl).pathname;
    } else {
      // Split on '?' or '#' if relative
      const [pathOnly] = rawPathOrUrl.split(/[?#]/);
      pathname = pathOnly || "/";
    }
  } catch {
    pathname = rawPathOrUrl.split(/[?#]/)[0] || "/";
  }

  const trimmed = pathname.trim().toLowerCase();
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const noTrailing = withLeading.replace(/\/+$/, "");
  return noTrailing || "/";
}

/**
 * Build an in-memory index mapping canonical paths to their cluster metadata.
 * Sourced directly from the Discovery Registry.
 */
export function buildRouteClusterMap(
  entries: DiscoveryEntry[] = getDiscoveryEntries(),
): Map<string, PathClusterMetadata> {
  const map = new Map<string, PathClusterMetadata>();

  for (const entry of entries) {
    if (!entry.canonicalPath) continue;

    const clusters = getEntryClusters(entry).map((c) => c.toLowerCase().trim());
    const curatedMatch = clusters.find((c) => isContentClusterSlug(c));
    const primary =
      curatedMatch ||
      entry.parentCluster?.toLowerCase().trim() ||
      (clusters.length > 0 ? clusters[0] : null);

    const normPath = normalizePath(entry.canonicalPath);
    map.set(normPath, {
      primaryContentCluster: primary,
      contentClusters: [...new Set(clusters)],
    });
  }

  return map;
}

/**
 * Get or build the cached route-to-cluster index.
 */
export function getRouteClusterMap(): Map<string, PathClusterMetadata> {
  if (!cachedRouteClusterMap) {
    cachedRouteClusterMap = buildRouteClusterMap();
  }
  return cachedRouteClusterMap;
}

/**
 * Reset the cached map (useful for test isolation).
 */
export function resetRouteClusterCache(): void {
  cachedRouteClusterMap = null;
}

/**
 * Resolve content cluster metadata for an incoming request path.
 */
export function resolvePathCluster(
  rawPathOrUrl: string,
  customMap?: Map<string, PathClusterMetadata>,
): PathClusterMetadata {
  const normPath = normalizePath(rawPathOrUrl);
  const map = customMap ?? getRouteClusterMap();
  const matched = map.get(normPath);

  if (matched) {
    return matched;
  }

  return {
    primaryContentCluster: null,
    contentClusters: [],
  };
}
