import { DiscoveryEntrySchema, type DiscoveryEntry } from "./schema";
import { entries as allEntries } from "./entries";

/** Every registered entry, parsed. */
export function getDiscoveryEntries(
  registry: DiscoveryEntry[] = allEntries,
): DiscoveryEntry[] {
  return registry.map((entry) => DiscoveryEntrySchema.parse(entry));
}

/** The entry that owns a canonical path, if any. */
export function getEntryByPath(
  path: string,
  registry: DiscoveryEntry[] = allEntries,
): DiscoveryEntry | undefined {
  return registry.find((entry) => entry.canonicalPath === path);
}

/** The entry with this id, if any. */
export function getEntryById(
  id: string,
  registry: DiscoveryEntry[] = allEntries,
): DiscoveryEntry | undefined {
  return registry.find((entry) => entry.id === id);
}

/**
 * Every phrasing an entry claims — its primary intent plus its aliases,
 * normalised the same way so lookups and collision checks agree.
 */
export function normaliseIntent(intent: string): string {
  return intent
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function claimedIntents(entry: DiscoveryEntry): string[] {
  return [entry.primaryIntent, ...entry.intentAliases].map(normaliseIntent);
}

/**
 * Finds the entry that already owns a phrasing — the lookup to run *before*
 * proposing a new page, and what the authoring workflow in
 * `docs/discovery-intent-registry.md` asks contributors to do first.
 */
export function findIntentOwner(
  intent: string,
  registry: DiscoveryEntry[] = allEntries,
): DiscoveryEntry | undefined {
  const target = normaliseIntent(intent);
  return registry.find((entry) => claimedIntents(entry).includes(target));
}

/** Entries grouped by `parentCluster`, for the audit's cluster report. */
export function getClusters(
  registry: DiscoveryEntry[] = allEntries,
): Map<string, DiscoveryEntry[]> {
  const clusters = new Map<string, DiscoveryEntry[]>();
  for (const entry of registry) {
    if (!entry.parentCluster) continue;
    const bucket = clusters.get(entry.parentCluster) ?? [];
    bucket.push(entry);
    clusters.set(entry.parentCluster, bucket);
  }
  return clusters;
}

/**
 * Clusters assigned to an entry: its explicit `clusters` array, plus its `parentCluster`
 * if specified.
 */
export function getEntryClusters(entry: DiscoveryEntry): string[] {
  const set = new Set<string>();
  if (entry.parentCluster) set.add(entry.parentCluster);
  for (const c of entry.clusters ?? []) {
    set.add(c);
  }
  return [...set];
}

/**
 * All live indexable entries that belong to a given cluster.
 */
export function getClusterEntries(
  cluster: string,
  registry: DiscoveryEntry[] = allEntries,
): DiscoveryEntry[] {
  const needle = cluster.toLowerCase().trim();
  return registry.filter((entry) => {
    if (!entry.indexable || entry.status !== "live") return false;
    const clusters = getEntryClusters(entry).map((c) => c.toLowerCase().trim());
    return clusters.includes(needle);
  });
}

/**
 * All unique canonical paths that belong to a given cluster.
 */
export function getClusterRoutes(
  cluster: string,
  registry: DiscoveryEntry[] = allEntries,
): string[] {
  return getClusterEntries(cluster, registry).map(
    (entry) => entry.canonicalPath,
  );
}
