import type { GuestHistory } from "schema";

const STORAGE_KEY = "guest_history";

/**
 * Retrieves the guest history entries from localStorage, sorted by last accessed date descending.
 */
export function getGuestHistory(): GuestHistory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    return parsed
      .map((entry) => ({
        publishId: String(entry.publishId || ""),
        vaultTitle: String(entry.vaultTitle || "Untitled World"),
        lastAccessed: String(entry.lastAccessed || new Date().toISOString()),
      }))
      .filter((entry) => entry.publishId)
      .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
  } catch (e) {
    console.warn("Failed to parse guest history", e);
    return [];
  }
}

/**
 * Adds or updates a guest history entry in localStorage.
 * Automatically caps history at 10 items.
 */
export function addGuestHistory(publishId: string, vaultTitle: string): void {
  if (typeof window === "undefined") return;
  const history = getGuestHistory();
  const index = history.findIndex((h) => h.publishId === publishId);

  const entry: GuestHistory = {
    publishId,
    vaultTitle: vaultTitle || "Untitled World",
    lastAccessed: new Date().toISOString(),
  };

  if (index !== -1) {
    history[index] = entry;
  } else {
    history.push(entry);
  }

  // Keep it sorted and cap to 10 entries to prevent localStorage bloat
  const updated = history
    .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
    .slice(0, 10);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save guest history", e);
  }
}

/**
 * Removes a guest history entry from localStorage.
 */
export function removeGuestHistory(publishId: string): void {
  if (typeof window === "undefined") return;
  const history = getGuestHistory();
  const updated = history.filter((h) => h.publishId !== publishId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to remove guest history entry", e);
  }
}

/**
 * Clears all guest history from localStorage.
 */
export function clearGuestHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear guest history", e);
  }
}
