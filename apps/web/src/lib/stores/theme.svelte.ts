import { THEMES, DEFAULT_THEME } from "schema";
import type {
  StylingTemplate,
  JargonMap,
  AppAppearanceId,
  ResolvedAppAppearanceId,
  WorldThemeId,
} from "schema";
import { browser } from "$app/env";
import { getDB } from "../utils/idb";
import { getOpfsRoot, getVaultDir, readFileAsText } from "../utils/opfs";
import { updateVaultConfig } from "../utils/vault-config";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import {
  APPEARANCE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  applyThemeTokensToDocument,
  getThemeJargon,
  isPublicThemePreviewActive,
  resolveStylingTemplate,
  resolveThemeJargon,
  setPublicThemePreviewActive,
} from "#lib/theme/theme-dom.js";
import { AppearanceStore, appearanceStore } from "./appearance.svelte";

import { guestVault } from "./guest-vault.svelte";
import { vaultRegistry } from "./vault-registry.svelte";

const CONFIG_PATH = [".codex", "config.json"];

export interface IThemeStorage {
  loadLocal(): string | null;
  saveLocal(id: string): void;
  loadAppAppearance(): string | null;
  saveAppAppearance(id: string): void;
  loadFromCache(vaultId: string): Promise<string | null>;
  saveToCache(vaultId: string, id: string): Promise<void>;
  loadFromDisk(vaultId: string): Promise<string | null>;
  saveToDisk(vaultId: string, id: string): Promise<void>;
}

const defaultThemeStorage: IThemeStorage = {
  loadLocal() {
    if (!browser) return null;
    try {
      return localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  saveLocal(id) {
    if (!browser) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // ignore
    }
  },
  loadAppAppearance() {
    if (!browser) return null;
    try {
      return localStorage.getItem(APPEARANCE_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  saveAppAppearance(id) {
    if (!browser) return;
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, id);
    } catch {
      // ignore
    }
  },
  async loadFromCache(vaultId) {
    const db = await getDB();
    return await db.get("settings", `theme_${vaultId}`);
  },
  async saveToCache(vaultId, id) {
    const db = await getDB();
    await db.put("settings", id, `theme_${vaultId}`);
  },
  async loadFromDisk(vaultId) {
    try {
      const root = await getOpfsRoot();
      const vaultDir = await getVaultDir(root, vaultId);
      const json = await readFileAsText(vaultDir, CONFIG_PATH);
      const config = JSON.parse(json);
      return config.theme || null;
    } catch {
      return null;
    }
  },
  async saveToDisk(vaultId, themeId) {
    try {
      await updateVaultConfig(vaultId, (config) => {
        config.theme = themeId;
      });
    } catch (err) {
      console.warn("[ThemeStore] Failed to save theme to disk", err);
    }
  },
};

export class ThemeStore {
  worldThemeId = $state<WorldThemeId>(DEFAULT_THEME.id);
  previewThemeId = $state<WorldThemeId | null>(null);

  /**
   * Optional callback for when the theme is explicitly changed.
   */
  onThemeUpdate?: (id: string) => void;

  // Dependencies
  private sessionModeStore: typeof sessionModeStore;
  private storage: IThemeStorage;
  private getVault: () => any;
  private appearance: AppearanceStore;

  get appAppearanceId(): AppAppearanceId {
    return this.appearance.appAppearanceId;
  }

  set appAppearanceId(value: AppAppearanceId) {
    this.appearance.appAppearanceId = value;
  }

  get isSystemDark(): boolean {
    return this.appearance.isSystemDark;
  }

  set isSystemDark(value: boolean) {
    this.appearance.isSystemDark = value;
  }

  activeTheme = $derived.by(() =>
    resolveStylingTemplate(
      this.previewThemeId || this.worldThemeId,
      this.resolvedAppAppearanceId,
    ),
  );

  get resolvedAppAppearanceId(): ResolvedAppAppearanceId {
    return this.appearance.resolvedAppAppearanceId;
  }

  get currentThemeId(): string {
    return this.worldThemeId;
  }

  set currentThemeId(id: string) {
    void this.setTheme(id);
  }

  /**
   * Resolved jargon for the active theme, falling back to defaults.
   */
  jargon = $derived(getThemeJargon(this.activeTheme));

  /**
   * Helper to resolve a jargon key with optional pluralization.
   */
  resolveJargon(key: keyof JargonMap, count?: number): string {
    return resolveThemeJargon(this.activeTheme, key, count);
  }

  constructor(
    sessionStore: typeof sessionModeStore = sessionModeStore,
    getVault?: () => any,
    storage: IThemeStorage = defaultThemeStorage,
    appearance?: AppearanceStore,
  ) {
    this.sessionModeStore = sessionStore;
    this.storage = storage;
    this.appearance =
      appearance ??
      new AppearanceStore({
        load: () => this.storage.loadAppAppearance(),
        save: (id) => this.storage.saveAppAppearance(id),
      });
    // Read the active vault id from the lightweight vault registry rather than
    // dynamically importing the full vault store. vault.svelte pulls in the
    // heavy search-orchestrator `.svelte.ts` chain (via vault → lifecycle /
    // search-store); a floating `import("./vault.svelte")` here could resolve
    // after a test's environment was torn down, causing Vitest
    // EnvironmentTeardownError (issue #1704). In non-guest mode (the only path
    // that reaches getVault) `vault.activeVaultId` is exactly
    // `vaultRegistry.activeVaultId`, so this is behaviourally equivalent while
    // avoiding the theme↔vault circular import.
    this.getVault =
      getVault || (() => ({ activeVaultId: vaultRegistry.activeVaultId }));

    // Apply initial theme
    const initial = this.storage.loadLocal();
    if (initial && THEMES[initial as WorldThemeId]) {
      this.worldThemeId = initial as WorldThemeId;
    } else {
      this.worldThemeId = DEFAULT_THEME.id;
    }

    // Apply initial theme immediately if in browser to prevent flash
    // before the first $effect runs.
    if (browser) {
      this.applyTheme(
        this.activeTheme,
        this.resolvedAppAppearanceId,
        this.appAppearanceId,
      );
    }

    $effect.root(() => {
      $effect(() => {
        this.applyTheme(
          this.activeTheme,
          this.resolvedAppAppearanceId,
          this.appAppearanceId,
        );
      });
    });
  }

  async init() {
    if (!browser) return;

    setPublicThemePreviewActive(false);

    if (this.sessionModeStore.isGuestMode) {
      if (guestVault.activeTheme?.id) {
        await this.setTheme(guestVault.activeTheme.id);
      }
      this.applyTheme(
        this.activeTheme,
        this.resolvedAppAppearanceId,
        this.appAppearanceId,
      );
      return;
    }

    // Use current active vault if available, otherwise fall back to localStorage
    const vault = await Promise.resolve(this.getVault());
    const activeVaultId = vault?.activeVaultId;

    if (activeVaultId) {
      await this.loadForVault(activeVaultId);
    } else {
      const stored = this.storage.loadLocal();
      if (
        stored &&
        THEMES[stored as WorldThemeId] &&
        this.worldThemeId !== stored
      ) {
        this.worldThemeId = stored as WorldThemeId;
      }
    }

    // Always re-apply tokens on app entry so any residual marketing preview
    // CSS variables are cleared even when worldThemeId itself is unchanged.
    this.applyTheme(
      this.activeTheme,
      this.resolvedAppAppearanceId,
      this.appAppearanceId,
    );
  }

  async loadForVault(vaultId: string) {
    if (
      !browser ||
      this.sessionModeStore.isDemoMode ||
      this.sessionModeStore.isGuestMode
    )
      return;

    this.previewThemeId = null; // Clear any preview on vault switch

    try {
      // Priority 1: OPFS (Vault Source of Truth)
      const opfsTheme = await this.storage.loadFromDisk(vaultId);
      if (opfsTheme && THEMES[opfsTheme as WorldThemeId]) {
        if (this.worldThemeId !== opfsTheme) {
          this.worldThemeId = opfsTheme as WorldThemeId;
        }
        this.storage.saveLocal(opfsTheme);
        this.applyTheme(
          this.activeTheme,
          this.resolvedAppAppearanceId,
          this.appAppearanceId,
        );
        return;
      }

      // Priority 2: IndexedDB (Local Cache)
      const stored = await this.storage.loadFromCache(vaultId);
      if (stored && THEMES[stored as WorldThemeId]) {
        if (this.worldThemeId !== stored) {
          this.worldThemeId = stored as WorldThemeId;
        }
        this.storage.saveLocal(stored);
        this.applyTheme(
          this.activeTheme,
          this.resolvedAppAppearanceId,
          this.appAppearanceId,
        );
        return;
      }

      // Fallback: Reset to default for new/empty vaults
      if (this.worldThemeId !== DEFAULT_THEME.id) {
        this.worldThemeId = DEFAULT_THEME.id;
        this.storage.saveLocal(DEFAULT_THEME.id);
        this.applyTheme(
          this.activeTheme,
          this.resolvedAppAppearanceId,
          this.appAppearanceId,
        );
      }
    } catch (e) {
      console.warn("[ThemeStore] Failed to load vault-specific theme", e);
    }
  }

  async hasSavedThemeForVault(vaultId: string): Promise<boolean> {
    if (
      !browser ||
      this.sessionModeStore.isDemoMode ||
      this.sessionModeStore.isGuestMode
    ) {
      return true;
    }

    try {
      const opfsTheme = await this.storage.loadFromDisk(vaultId);
      if (opfsTheme && THEMES[opfsTheme as WorldThemeId]) return true;

      const cachedTheme = await this.storage.loadFromCache(vaultId);
      return Boolean(cachedTheme && THEMES[cachedTheme as WorldThemeId]);
    } catch (e) {
      console.warn("[ThemeStore] Failed to check vault-specific theme", e);
      return true;
    }
  }

  async setTheme(id: string) {
    if (!THEMES[id as WorldThemeId]) return;

    this.worldThemeId = id as WorldThemeId;
    this.onThemeUpdate?.(id);
    if (browser) {
      // Don't persist theme if in demo mode
      if (this.sessionModeStore.isDemoMode) return;

      this.storage.saveLocal(id);

      const vault = await Promise.resolve(this.getVault());
      const activeVaultId = vault?.activeVaultId;

      if (activeVaultId) {
        try {
          // 1. Save to IDB for fast local lookup
          await this.storage.saveToCache(activeVaultId, id);

          // 2. Save to OPFS for sync/persistence
          await this.storage.saveToDisk(activeVaultId, id);
        } catch (e) {
          console.warn("[ThemeStore] Failed to save vault-specific theme", e);
        }
      }
    }
  }

  setAppAppearance(id: AppAppearanceId) {
    this.appearance.setAppAppearance(
      id,
      browser && !this.sessionModeStore.isDemoMode,
    );
  }

  previewTheme(id: string | null) {
    this.previewThemeId = id as WorldThemeId | null;
  }

  private applyTheme(
    theme: StylingTemplate,
    appearance: ResolvedAppAppearanceId,
    appearanceChoice: AppAppearanceId,
  ) {
    if (isPublicThemePreviewActive()) return;
    applyThemeTokensToDocument({
      theme,
      worldThemeId: this.previewThemeId || this.worldThemeId,
      appearance,
      appearanceChoice,
    });
  }
}

const THEME_KEY = "__codex_theme_instance__";
export const themeStore: ThemeStore =
  (globalThis as any)[THEME_KEY] ??
  ((globalThis as any)[THEME_KEY] = new ThemeStore(
    sessionModeStore,
    undefined,
    defaultThemeStorage,
    appearanceStore,
  ));

if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as any).themeStore = themeStore;
}
