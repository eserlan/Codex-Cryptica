import { THEMES, DEFAULT_THEME, DEFAULT_JARGON } from "schema";
import type { StylingTemplate, JargonMap } from "schema";
import { browser } from "$app/environment";
import { getDB } from "../utils/idb";
import { vault } from "./vault.svelte";
import { uiStore } from "./ui.svelte";

const STORAGE_KEY = "codex-cryptica-active-theme";

class ThemeStore {
  currentThemeId = $state(DEFAULT_THEME.id);
  previewThemeId = $state<string | null>(null);

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
   * Helper to resolve a specific jargon key with optional pluralization.
   */
  resolveJargon(key: keyof JargonMap, count?: number): string {
    if (count !== undefined && count !== 1) {
      const pluralKey = `${String(key)}_plural`;
      if (this.jargon[pluralKey]) return this.jargon[pluralKey];
    }
    return this.jargon[key] || DEFAULT_JARGON[key] || String(key);
  }

  constructor() {
    $effect.root(() => {
      $effect(() => {
        this.applyTheme(this.activeTheme);
      });
    });
  }

  async init() {
    if (!browser) return;

    // If we have an active vault ID already (from registry init), use it.
    // Otherwise, fall back to global selection until a vault is explicitly switched.
    if (vault.activeVaultId) {
      await this.loadForVault(vault.activeVaultId);
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && THEMES[stored]) {
        this.currentThemeId = stored;
      }
    }
  }

  async loadForVault(vaultId: string) {
    if (!browser || uiStore.isDemoMode) return;
    try {
      const db = await getDB();
      const stored = await db.get("settings", `theme_${vaultId}`);
      if (stored && THEMES[stored]) {
        this.currentThemeId = stored;
      } else {
        // For new vaults, we want to start with default
        // instead of inheriting whatever was in localStorage/global state
        this.currentThemeId = DEFAULT_THEME.id;
      }
    } catch (e) {
      console.warn("[ThemeStore] Failed to load vault-specific theme", e);
    }
  }

  async setTheme(id: string) {
    if (!THEMES[id]) return;

    this.currentThemeId = id;
    if (browser) {
      // Don't persist theme if in demo mode
      if (uiStore.isDemoMode) return;

      localStorage.setItem(STORAGE_KEY, id);
      const activeVaultId = vault.activeVaultId;
      if (activeVaultId) {
        try {
          const db = await getDB();
          await db.put("settings", id, `theme_${activeVaultId}`);
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

    root.style.setProperty("--font-header", tokens.fontHeader);
    root.style.setProperty("--font-body", tokens.fontBody);

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

export const themeStore = new ThemeStore();
