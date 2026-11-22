import type { AppAppearanceId, ResolvedAppAppearanceId } from "schema";
import {
  APPEARANCE_STORAGE_KEY,
  readStoredAppearanceChoice,
  resolveAppAppearance,
} from "#lib/theme/theme-dom.js";

export interface AppearanceStorage {
  load(): string | null;
  save(id: string): void;
}

export type MatchMediaFn = (query: string) => MediaQueryList | null | undefined;

const defaultAppearanceStorage: AppearanceStorage = {
  load() {
    if (typeof localStorage === "undefined") return null;
    try {
      return localStorage.getItem(APPEARANCE_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  save(id) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, id);
    } catch {
      // Continue in-memory when storage is unavailable or blocked.
    }
  },
};

function defaultMatchMedia(): MatchMediaFn | undefined {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    return (query: string) => window.matchMedia(query);
  }
  return undefined;
}

function isAppearanceChoice(value: string | null): value is AppAppearanceId {
  return (
    value === "neutral-light" || value === "neutral-dark" || value === "system"
  );
}

export class AppearanceStore {
  appAppearanceId = $state<AppAppearanceId>("system");
  isSystemDark = $state<boolean>(false);

  resolvedAppAppearanceId = $derived<ResolvedAppAppearanceId>(
    resolveAppAppearance(this.appAppearanceId, this.isSystemDark),
  );

  private readonly storage: AppearanceStorage;

  constructor(
    storage: AppearanceStorage = defaultAppearanceStorage,
    matchMedia: MatchMediaFn | undefined = defaultMatchMedia(),
  ) {
    this.storage = storage;

    if (matchMedia) {
      const mediaQuery = matchMedia("(prefers-color-scheme: dark)");
      if (mediaQuery) {
        this.isSystemDark = Boolean(mediaQuery.matches);
        const listener = (e: MediaQueryListEvent) => {
          this.isSystemDark = e.matches;
        };
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener("change", listener);
        } else if (mediaQuery.addListener) {
          mediaQuery.addListener(listener);
        }
      }
    }

    let initial: string | null;
    try {
      initial = this.storage.load();
    } catch {
      initial = null;
    }
    this.appAppearanceId = isAppearanceChoice(initial)
      ? initial
      : readStoredAppearanceChoice(null);
  }

  setAppAppearance(id: AppAppearanceId, persist = true): void {
    this.appAppearanceId = id;
    if (!persist) return;
    try {
      this.storage.save(id);
    } catch {
      // Non-fatal in private browsing or restricted storage environments.
    }
  }
}

const KEY = "__codex_appearance_store__v1__";
const globalScope = globalThis as unknown as Record<
  string,
  AppearanceStore | undefined
>;
export const appearanceStore: AppearanceStore =
  globalScope[KEY] ?? (globalScope[KEY] = new AppearanceStore());
