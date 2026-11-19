export const ARTWORK_ENABLED_KEY = "codex-adventure-artwork-enabled";
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

/** Device preference with an in-memory fallback when storage is blocked. */
export class ArtworkPreferences {
  private current = true;
  private readonly listeners = new Set<(enabled: boolean) => void>();
  constructor(
    private readonly storage: PreferenceStorage | null = defaultStorage(),
  ) {
    try {
      this.current = storage?.getItem(ARTWORK_ENABLED_KEY) !== "false";
    } catch {
      /* Keep default. */
    }
  }
  get enabled(): boolean {
    return this.current;
  }
  subscribe(listener: (enabled: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  setEnabled(enabled: boolean): boolean {
    this.current = enabled;
    for (const listener of this.listeners) listener(enabled);
    try {
      if (!this.storage) return false;
      this.storage.setItem(ARTWORK_ENABLED_KEY, String(enabled));
      return true;
    } catch {
      return false;
    }
  }
}
function defaultStorage(): PreferenceStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
export const artworkPreferences = new ArtworkPreferences();
