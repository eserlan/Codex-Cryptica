import type { GuestHistory } from "schema";
import {
  type Clock,
  systemClock,
  browserStorage,
  type StorageLike,
} from "#lib/utils/runtime-deps.js";

const STORAGE_KEY = "guest_history";

/**
 * Retrieves the guest history entries from storage, sorted by last accessed date descending.
 */
export function getGuestHistory(
  storage: StorageLike = browserStorage,
  clock: Clock = systemClock,
): GuestHistory[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => ({
        publishId: String(entry.publishId || ""),
        vaultTitle: String(entry.vaultTitle || "Untitled World"),
        lastAccessed: String(
          entry.lastAccessed || new Date(clock.now()).toISOString(),
        ),
      }))
      .filter((entry) => entry.publishId)
      .sort(
        (a, b) =>
          new Date(b.lastAccessed).getTime() -
          new Date(a.lastAccessed).getTime(),
      );
  } catch (e) {
    console.warn("Failed to parse guest history", e);
    return [];
  }
}

/**
 * Adds or updates a guest history entry in storage.
 * Automatically caps history at 10 items.
 */
export function addGuestHistory(
  publishId: string,
  vaultTitle: string,
  storage: StorageLike = browserStorage,
  clock: Clock = systemClock,
): void {
  const history = getGuestHistory(storage, clock);
  const index = history.findIndex((h) => h.publishId === publishId);

  const entry: GuestHistory = {
    publishId,
    vaultTitle: vaultTitle || "Untitled World",
    lastAccessed: new Date(clock.now()).toISOString(),
  };

  if (index !== -1) {
    history[index] = entry;
  } else {
    history.push(entry);
  }

  // Keep it sorted and cap to 10 entries to prevent storage bloat
  const updated = history
    .sort(
      (a, b) =>
        new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime(),
    )
    .slice(0, 10);

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save guest history", e);
  }
}

/**
 * Removes a guest history entry from storage.
 */
export function removeGuestHistory(
  publishId: string,
  storage: StorageLike = browserStorage,
  clock: Clock = systemClock,
): void {
  const history = getGuestHistory(storage, clock);
  const updated = history.filter((h) => h.publishId !== publishId);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to remove guest history entry", e);
  }
}

/**
 * Clears all guest history from storage.
 */
export function clearGuestHistory(storage: StorageLike = browserStorage): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear guest history", e);
  }
}
