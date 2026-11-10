import { THEMES } from "schema";
import type { WorldThemeId } from "schema";

/**
 * A visitor's public browsing genre, separate from the persisted vault theme.
 * sessionStorage survives refreshes and full navigations in this tab without
 * affecting another tab or a vault's OPFS/IndexedDB theme preference.
 */
export const PUBLIC_THEME_STORAGE_KEY = "cc-public-genre";

type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserSessionStorage(): SessionStorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    // Storage can be disabled (e.g. private browsing or restricted embeds).
    return null;
  }
}

function validTheme(id: string | null): id is WorldThemeId {
  return Boolean(id && Object.prototype.hasOwnProperty.call(THEMES, id));
}

export class PublicThemeStore {
  #themeId = $state<WorldThemeId | null>(null);
  private storage: SessionStorageLike | null;

  constructor(storage: SessionStorageLike | null = browserSessionStorage()) {
    this.storage = storage;
    // Read synchronously, before generator defaults are constructed.
    this.#themeId = this.readStoredTheme();
  }

  get themeId(): WorldThemeId | null {
    return this.#themeId;
  }

  /** An explicitly themed public destination or generator choice wins. */
  setTheme(id: string | null): void {
    if (!validTheme(id)) return;
    this.#themeId = id;
    try {
      this.storage?.setItem(PUBLIC_THEME_STORAGE_KEY, id);
    } catch {
      // Continue with in-memory navigation when storage is unavailable.
    }
  }

  /** Explicit reset only. Genre-less destinations must not call this. */
  clear(): void {
    this.#themeId = null;
    try {
      this.storage?.removeItem(PUBLIC_THEME_STORAGE_KEY);
    } catch {
      // Keep in-memory reset even if persistence is blocked.
    }
  }

  private readStoredTheme(): WorldThemeId | null {
    try {
      const stored = this.storage?.getItem(PUBLIC_THEME_STORAGE_KEY) ?? null;
      return validTheme(stored) ? stored : null;
    } catch {
      return null;
    }
  }
}

export const publicThemeStore = new PublicThemeStore();
