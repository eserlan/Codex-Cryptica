export const AUTOMATIC_CACHE_LIMIT = 32 * 1024 * 1024;
export const TOTAL_ARTWORK_CACHE_LIMIT = 256 * 1024 * 1024;
export interface CachedArtworkEntry {
  id: string;
  bytes: number;
  lastUsed: number;
  protected: boolean;
}
export type CachePlan =
  | { ok: true; evict: string[] }
  | { ok: false; reason: "capacity" | "invalid-index" };

/** Plan a single automatic insertion without mutating the stored index. */
export function planCacheMutation(
  entries: readonly CachedArtworkEntry[],
  incoming: { id: string; bytes: number },
): CachePlan {
  if (
    !incoming.id ||
    !Number.isSafeInteger(incoming.bytes) ||
    incoming.bytes <= 0
  )
    return { ok: false, reason: "invalid-index" };
  const ids = new Set<string>();
  for (const entry of entries) {
    if (
      !entry.id ||
      ids.has(entry.id) ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes <= 0 ||
      !Number.isFinite(entry.lastUsed)
    )
      return { ok: false, reason: "invalid-index" };
    ids.add(entry.id);
  }
  const existing = entries.find((entry) => entry.id === incoming.id);
  if (existing)
    return existing.bytes === incoming.bytes
      ? { ok: true, evict: [] }
      : { ok: false, reason: "invalid-index" };
  let automatic =
    entries
      .filter((entry) => !entry.protected)
      .reduce((sum, entry) => sum + entry.bytes, 0) + incoming.bytes;
  let total =
    entries.reduce((sum, entry) => sum + entry.bytes, 0) + incoming.bytes;
  const candidates = entries
    .filter((entry) => !entry.protected)
    .slice()
    .sort(
      (a, b) =>
        a.lastUsed - b.lastUsed || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  const evict: string[] = [];
  for (const entry of candidates) {
    if (
      automatic <= AUTOMATIC_CACHE_LIMIT &&
      total <= TOTAL_ARTWORK_CACHE_LIMIT
    )
      break;
    automatic -= entry.bytes;
    total -= entry.bytes;
    evict.push(entry.id);
  }
  return automatic <= AUTOMATIC_CACHE_LIMIT &&
    total <= TOTAL_ARTWORK_CACHE_LIMIT
    ? { ok: true, evict }
    : { ok: false, reason: "capacity" };
}
