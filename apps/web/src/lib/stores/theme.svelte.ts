import { THEMES, DEFAULT_THEME, DEFAULT_JARGON } from "schema";
if (
  import.meta.env.DEV ||
  (typeof window !== "undefined" && (window as any).__E2E__)
) {
  console.error("[ThemeStore] Script executing");
}
import type { StylingTemplate, JargonMap } from "schema";
import { browser } from "$app/environment";
import { getDB } from "../utils/idb";
import { hexToRgb } from "../utils/color";
import { vault } from "./vault.svelte";
import { uiStore as defaultUiStore } from "./ui.svelte";
import {
  getOpfsRoot,
  getVaultDir,
  readFileAsText,
  writeOpfsFile,
} from "../utils/opfs";

const STORAGE_KEY = "codex-cryptica-active-theme";
const CONFIG_PATH = [".codex", "config.json"];

export interface IThemeStorage {
  loadLocal(): string | null;
  saveLocal(id: string): void;
  loadFromCache(vaultId: string): Promise<string | null>;
  saveToCache(vaultId: string, id: string): Promise<void>;
  loadFromDisk(vaultId: string): Promise<string | null>;
  saveToDisk(vaultId: string, id: string): Promise<void>;
}

export class ThemeStore {
  currentThemeId = $state<string>(DEFAULT_THEME.id); // Will be set in constructor/init
  previewThemeId = $state<string | null>(null);

  /**
   * Optional callback for when the theme is explicitly changed.
   */
  onThemeUpdate?: (id: string) => void;

  // Dependencies
  private uiStore: typeof defaultUiStore;
  private storage: IThemeStorage;

  activeTheme = $derived(
    this.previewThemeId
      ? THEMES[this.previewThemeId]
      : THEMES[this.currentThemeId] || DEFAULT_THEME,
  );

  /**
   * Resolved jargon for the active theme, falling back to defaults.
   */
  jargon = $derived({
    ...DEFAULT_JARGON,
    ...(this.activeTheme.jargon || {}),
  } as JargonMap);

  /**
   * Helper to resolve a jargon key with optional pluralization.
   */
  resolveJargon(key: keyof JargonMap, count?: number): string {
    if (count !== undefined && count !== 1) {
      const pluralKey = `${String(key)}_plural`;
      if (this.jargon[pluralKey]) return this.jargon[pluralKey];
    }
    return this.jargon[key] || DEFAULT_JARGON[key] || String(key);
  }

  constructor(
    uiStore: typeof defaultUiStore = defaultUiStore,
    storage: IThemeStorage = {
      loadLocal() {
        if (!browser) return null;
        return localStorage.getItem(STORAGE_KEY);
      },
      saveLocal(id) {
        if (!browser) return;
        localStorage.setItem(STORAGE_KEY, id);
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
          const root = await getOpfsRoot();
          const vaultDir = await getVaultDir(root, vaultId);

          let config: any = {};
          try {
            const json = await readFileAsText(vaultDir, CONFIG_PATH);
            config = JSON.parse(json);
          } catch {
            // New config
          }

          config.theme = themeId;
          await writeOpfsFile(
            CONFIG_PATH,
            JSON.stringify(config, null, 2),
            vaultDir,
            vaultId,
          );
        } catch (err) {
          console.warn("[ThemeStore] Failed to save theme to disk", err);
        }
      },
    },
  ) {
    this.uiStore = uiStore;
    this.storage = storage;

    // Apply initial theme
    const initial = this.storage.loadLocal();
    if (initial && THEMES[initial]) {
      this.currentThemeId = initial;
    }

    // Apply initial theme immediately if in browser to prevent flash
    // before the first $effect runs.
    if (browser) {
      this.applyTheme(this.activeTheme);
    }

    $effect.root(() => {
      $effect(() => {
        this.applyTheme(this.activeTheme);
      });
    });
  }

  async init() {
    if (!browser) return;

    // Use current active vault if available, otherwise fall back to localStorage
    const activeVaultId = vault.activeVaultId;
    if (activeVaultId) {
      await this.loadForVault(activeVaultId);
    } else {
      const stored = this.storage.loadLocal();
      if (stored && THEMES[stored] && this.currentThemeId !== stored) {
        this.currentThemeId = stored;
      }
    }
  }

  async loadForVault(vaultId: string) {
    if (!browser || this.uiStore.isDemoMode) return;

    this.previewThemeId = null; // Clear any preview on vault switch

    try {
      // Priority 1: OPFS (Vault Source of Truth)
      const opfsTheme = await this.storage.loadFromDisk(vaultId);
      if (opfsTheme && THEMES[opfsTheme]) {
        if (this.currentThemeId !== opfsTheme) {
          this.currentThemeId = opfsTheme;
        }
        this.storage.saveLocal(opfsTheme);
        this.applyTheme(this.activeTheme);
        return;
      }

      // Priority 2: IndexedDB (Local Cache)
      const stored = await this.storage.loadFromCache(vaultId);
      if (stored && THEMES[stored]) {
        if (this.currentThemeId !== stored) {
          this.currentThemeId = stored;
        }
        this.storage.saveLocal(stored);
        this.applyTheme(this.activeTheme);
        return;
      }

      // Fallback: Reset to default for new/empty vaults
      if (this.currentThemeId !== DEFAULT_THEME.id) {
        this.currentThemeId = DEFAULT_THEME.id;
        this.storage.saveLocal(DEFAULT_THEME.id);
        this.applyTheme(this.activeTheme);
      }
    } catch (e) {
      console.warn("[ThemeStore] Failed to load vault-specific theme", e);
    }
  }

  async setTheme(id: string) {
    if (!THEMES[id]) return;

    this.currentThemeId = id;
    this.onThemeUpdate?.(id);
    if (browser) {
      // Don't persist theme if in demo mode
      if (this.uiStore.isDemoMode) return;

      this.storage.saveLocal(id);
      const activeVaultId = vault.activeVaultId;
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

  previewTheme(id: string | null) {
    this.previewThemeId = id;
  }

  private applyTheme(theme: StylingTemplate) {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const tokens = theme.tokens;

    root.style.setProperty("--color-bg-primary", tokens.background);
    root.style.setProperty("--color-bg-surface", tokens.surface);
    root.style.setProperty("--color-accent-primary", tokens.primary);
    root.style.setProperty("--color-accent-dim", tokens.secondary);
    root.style.setProperty("--color-accent-dark", tokens.secondary);
    root.style.setProperty("--color-accent-deep", tokens.background);
    root.style.setProperty("--color-border-primary", tokens.border);

    // Base accent alias (for --color-theme-accent and --color-theme-danger)
    root.style.setProperty("--color-accent", tokens.accent);

    // RGB versions for rgba() usage in shadows/overlays
    root.style.setProperty(
      "--color-accent-primary-rgb",
      hexToRgb(tokens.primary),
    );
    root.style.setProperty("--color-theme-accent-rgb", hexToRgb(tokens.accent));
    // Compatibility aliases
    root.style.setProperty("--theme-primary-rgb", hexToRgb(tokens.primary));
    root.style.setProperty("--theme-accent-rgb", hexToRgb(tokens.accent));

    root.style.setProperty("--color-text-primary", tokens.text);
    root.style.setProperty("--color-text-muted", tokens.secondary);
    root.style.setProperty("--color-text-dim", tokens.secondary);

    root.style.setProperty("--color-theme-accent", tokens.accent);

    root.style.setProperty("--color-oracle-primary", tokens.accent);
    root.style.setProperty(
      "--color-oracle-dim",
      `color-mix(in srgb, ${tokens.accent}, ${tokens.background} 30%)`,
    );
    root.style.setProperty(
      "--color-oracle-dark",
      `color-mix(in srgb, ${tokens.accent}, ${tokens.background} 60%)`,
    );

    root.style.setProperty("--font-header-val", tokens.fontHeader);
    root.style.setProperty("--font-body-val", tokens.fontBody);

    root.style.setProperty(
      "--theme-border-width",
      `${theme.graph.nodeBorderWidth}px`,
    );

    // Theme specific visual behaviors
    let glow = "none";
    if (theme.id === "cyberpunk") glow = `0 0 15px ${tokens.primary}44`;
    if (theme.id === "horror") glow = `0 0 20px ${tokens.primary}33`;
    root.style.setProperty("--theme-glow", glow);

    let radius = "2px"; // Gothic/Terminal default
    if (theme.id === "modern") radius = "12px";
    if (theme.id === "fantasy") radius = "6px"; // Softer look for fantasy
    if (theme.id === "horror") radius = "0px"; // Sharp corners for horror
    root.style.setProperty("--theme-border-radius", radius);

    if (tokens.texture) {
      root.style.setProperty(
        "--bg-texture",
        `url('/themes/${tokens.texture}')`,
      );
      root.style.setProperty(
        "--bg-texture-overlay",
        `linear-gradient(${tokens.background}80, ${tokens.background}80), url('/themes/${tokens.texture}')`,
      );
    } else {
      root.style.setProperty("--bg-texture", "none");
      root.style.setProperty("--bg-texture-overlay", "none");
    }
  }
}

const THEME_KEY = "__codex_theme_instance__";
export const themeStore: ThemeStore =
  (globalThis as any)[THEME_KEY] ??
  ((globalThis as any)[THEME_KEY] = new ThemeStore());

if (
  typeof window !== "undefined" &&
  (import.meta.env.DEV || (window as any).__E2E__)
) {
  (window as any).themeStore = themeStore;
}
