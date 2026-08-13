export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const browserStorage: StorageLike = {
  getItem(key) {
    if (typeof localStorage === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage may be unavailable in private browsing or restricted workers.
    }
  },
  removeItem(key) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage may be unavailable in private browsing or restricted workers.
    }
  },
};

export function assertAIEnabled(storage: StorageLike = browserStorage) {
  if (!isAIEnabled(storage)) {
    throw new Error("AI features are disabled.");
  }
}

export function isAIEnabled(storage: StorageLike = browserStorage): boolean {
  // `browserStorage` is SSR-safe and swallows access errors (returning null), so
  // in workers / when localStorage is unavailable both lookups are null and we
  // fall through to `true` — preserving the previous "don't block" behaviour.
  // The actual text generation call is gated by the main-thread OracleStore.
  if (storage.getItem("codex_ai_disabled") === "true") return false;

  // Fallback to old "lite" flag if present.
  if (storage.getItem("codex_ai_lite_mode") === "true") return false;

  return true;
}
