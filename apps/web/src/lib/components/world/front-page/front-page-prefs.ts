import {
  DEFAULT_RECENT_LIMIT,
  MIN_RECENT_LIMIT,
  MAX_RECENT_LIMIT,
} from "./front-page-constants";

/**
 * Generate the localStorage key for the recent-limit preference.
 */
export function getRecentLimitStorageKey(vaultId: string): string {
  return `codex_front_page_recent_limit:${vaultId}`;
}

/**
 * Clamp a raw number to the allowed [MIN, MAX] range.
 */
export function clampRecentLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_RECENT_LIMIT;
  return Math.min(MAX_RECENT_LIMIT, Math.max(MIN_RECENT_LIMIT, value));
}

/**
 * Read the recent-limit preference from localStorage.
 * Returns the default when the key is missing, the value is not a number,
 * or when running outside a browser.
 */
export function readRecentLimit(vaultId: string): number {
  if (typeof window === "undefined") return DEFAULT_RECENT_LIMIT;
  const raw = window.localStorage.getItem(getRecentLimitStorageKey(vaultId));
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_RECENT_LIMIT;
  return clampRecentLimit(parsed);
}

/**
 * Persist the recent-limit preference to localStorage.
 * No-op outside a browser.
 */
export function persistRecentLimit(vaultId: string, limit: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getRecentLimitStorageKey(vaultId), String(limit));
}
