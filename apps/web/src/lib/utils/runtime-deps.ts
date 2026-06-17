/**
 * Small seams for ambient runtime dependencies (time, id generation, storage) so
 * services can inject deterministic fakes in tests while production keeps the
 * real globals (Constitution VIII).
 *
 * Defaults resolve their global **lazily at call time** — never captured at
 * construction — so a singleton constructed at import still works when the global
 * is polyfilled later (the lesson from #1363).
 */
import type { StorageLike } from "$lib/stores/ui/persistence";

export type { StorageLike };

export interface Clock {
  now(): number;
}

export interface IdGenerator {
  uuid(): string;
}

/** Production clock backed by `Date`. */
export const systemClock: Clock = {
  now: () => Date.now(),
};

/** Production id generator backed by `crypto.randomUUID`, resolved lazily. */
export const systemIdGenerator: IdGenerator = {
  uuid: () => globalThis.crypto.randomUUID(),
};

/**
 * Production storage backed by `localStorage`, resolved lazily and SSR-safe:
 * no-ops (and returns null) when `localStorage` is unavailable.
 */
export const browserStorage: StorageLike = {
  getItem(key) {
    if (typeof localStorage === "undefined") return null;
    // Access can throw (SecurityError, blocked/quota storage) — treat as absent.
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
      // ignore — storage unavailable or quota exceeded
    }
  },
  removeItem(key) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore — storage unavailable
    }
  },
};
