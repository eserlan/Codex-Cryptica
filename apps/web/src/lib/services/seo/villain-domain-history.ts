import {
  browserSessionStorage,
  type StorageLike,
} from "$lib/utils/runtime-deps";

const STORAGE_KEY = "VILLAIN_CONFLICT_DOMAIN_HISTORY";
const MAX_HISTORY = 5;

/**
 * Tracks the dominant conflict domain of recently generated BBEG villains
 * this browser session, so the generator prompt can avoid repeating an
 * overused domain (e.g. logistics/bureaucracy) instead of only being told
 * to avoid it in the abstract (#2325 follow-up).
 */
export class VillainDomainHistoryStore {
  private storage: StorageLike;

  constructor(storage: StorageLike = browserSessionStorage) {
    this.storage = storage;
  }

  private load(): string[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.filter((d): d is string => typeof d === "string")
        : [];
    } catch {
      return [];
    }
  }

  /** Most recent domains first, oldest last. */
  recent(): string[] {
    return this.load();
  }

  record(domain: string | undefined): void {
    const trimmed = domain?.trim();
    if (!trimmed) return;
    const next = [trimmed, ...this.load().filter((d) => d !== trimmed)].slice(
      0,
      MAX_HISTORY,
    );
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Best-effort — storage may be unavailable (private mode, quota).
    }
  }
}

export const villainDomainHistoryStore = new VillainDomainHistoryStore();
