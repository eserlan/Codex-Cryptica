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

export {
  type Clock,
  type IdGenerator,
  systemClock,
  systemIdGenerator,
} from "@codex/runtime";

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
  get length(): number {
    if (typeof localStorage === "undefined") return 0;
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  },
  key(index: number): string | null {
    if (typeof localStorage === "undefined") return null;
    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  },
};

/**
 * Production storage backed by `sessionStorage`, resolved lazily and SSR-safe:
 * no-ops (and returns null) when `sessionStorage` is unavailable.
 */
export const browserSessionStorage: StorageLike = {
  getItem(key) {
    if (typeof sessionStorage === "undefined") return null;
    // Access can throw (SecurityError, blocked/quota storage) — treat as absent.
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    if (typeof sessionStorage === "undefined") return;
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // ignore — storage unavailable or quota exceeded
    }
  },
  removeItem(key) {
    if (typeof sessionStorage === "undefined") return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore — storage unavailable
    }
  },
  get length(): number {
    if (typeof sessionStorage === "undefined") return 0;
    try {
      return sessionStorage.length;
    } catch {
      return 0;
    }
  },
  key(index: number): string | null {
    if (typeof sessionStorage === "undefined") return null;
    try {
      return sessionStorage.key(index);
    } catch {
      return null;
    }
  },
};
