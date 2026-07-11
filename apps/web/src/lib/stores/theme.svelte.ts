import {
  THEMES,
  DEFAULT_THEME,
  DEFAULT_JARGON,
  WORKSPACE_DARK,
  FANTASY_DARK,
  PIRATE_DARK,
  MODERN_DARK,
  SCIFI_LIGHT,
  CYBERPUNK_LIGHT,
  APOCALYPTIC_LIGHT,
  HORROR_LIGHT,
  FALLOUT_LIGHT,
  STARWARS_LIGHT,
  STARTREK_LIGHT,
  LANCER_LIGHT,
  WESTERN_DARK,
  STEAMPUNK_DARK,
} from "schema";
import type {
  StylingTemplate,
  JargonMap,
  AppAppearanceId,
  ResolvedAppAppearanceId,
  WorldThemeId,
} from "schema";
import { browser } from "$app/environment";
import { getDB } from "../utils/idb";
import { hexToRgb } from "../utils/color";
import {
  getOpfsRoot,
  getVaultDir,
  readFileAsText,
  writeOpfsFile,
} from "../utils/opfs";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

import { guestVault } from "./guest-vault.svelte";

const STORAGE_KEY = "codex-cryptica-active-theme";
const APPEARANCE_KEY = "codex-cryptica-app-appearance";
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

export class ThemeStore {
  appAppearanceId = $state<AppAppearanceId>("system");
  worldThemeId = $state<WorldThemeId>(DEFAULT_THEME.id);
  previewThemeId = $state<WorldThemeId | null>(null);
  isSystemDark = $state<boolean>(false);

  /**
   * Optional callback for when the theme is explicitly changed.
   */
  onThemeUpdate?: (id: string) => void;

  // Dependencies
  private sessionModeStore: typeof sessionModeStore;
  private storage: IThemeStorage;
  private getVault: () => any;

  activeTheme = $derived.by(() => {
    const rawId = this.previewThemeId || this.worldThemeId || DEFAULT_THEME.id;
    const id = rawId.replace(/_(light|dark)$/, "") as WorldThemeId;
    const isDark = this.resolvedAppAppearanceId === "neutral-dark";

    if (isDark) {
      switch (id) {
        case "workspace":
          return WORKSPACE_DARK;
        case "fantasy":
          return FANTASY_DARK;
        case "pirate":
          return PIRATE_DARK;
        case "modern":
          return MODERN_DARK;
        case "western":
          return WESTERN_DARK;
        case "steampunk":
          return STEAMPUNK_DARK;
        default:
          return (THEMES as any)[id] || DEFAULT_THEME;
      }
    } else {
      switch (id) {
        case "workspace":
          return THEMES.workspace;
        case "fantasy":
          return THEMES.fantasy;
        case "pirate":
          return THEMES.pirate;
        case "modern":
          return THEMES.modern;
        case "scifi":
          return SCIFI_LIGHT;
        case "cyberpunk":
          return CYBERPUNK_LIGHT;
        case "apocalyptic":
          return APOCALYPTIC_LIGHT;
        case "horror":
          return HORROR_LIGHT;
        case "fallout":
          return FALLOUT_LIGHT;
        case "starwars":
          return STARWARS_LIGHT;
        case "startrek":
          return STARTREK_LIGHT;
        case "lancer":
          return LANCER_LIGHT;
        case "western":
          return THEMES.western;
        case "steampunk":
          return THEMES.steampunk;
        default:
          return DEFAULT_THEME;
      }
    }
  });

  resolvedAppAppearanceId = $derived<ResolvedAppAppearanceId>(
    this.appAppearanceId === "system"
      ? this.isSystemDark
        ? "neutral-dark"
        : "neutral-light"
      : this.appAppearanceId === "neutral-dark"
        ? "neutral-dark"
        : "neutral-light",
  );

  get currentThemeId(): string {
    return this.worldThemeId;
  }

  set currentThemeId(id: string) {
    void this.setTheme(id);
  }

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
    sessionStore: typeof sessionModeStore = sessionModeStore,
    getVault?: () => any,
    storage: IThemeStorage = {
      loadLocal() {
        if (!browser) return null;
        return localStorage.getItem(STORAGE_KEY);
      },
      saveLocal(id) {
        if (!browser) return;
        localStorage.setItem(STORAGE_KEY, id);
      },
      loadAppAppearance() {
        if (!browser) return null;
        return localStorage.getItem(APPEARANCE_KEY);
      },
      saveAppAppearance(id) {
        if (!browser) return;
        localStorage.setItem(APPEARANCE_KEY, id);
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
    this.sessionModeStore = sessionStore;
    this.storage = storage;
    this.getVault =
      getVault || (() => import("./vault.svelte").then((m) => m.vault));

    // Media query listener for prefers-color-scheme
    if (
      browser &&
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function"
    ) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      this.isSystemDark = mediaQuery.matches;

      // Use modern addEventListener if available, fallback to addListener
      const listener = (e: MediaQueryListEvent) => {
        this.isSystemDark = e.matches;
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", listener);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(listener);
      }
    }

    // Apply initial app appearance
    const initialAppearance = this.storage.loadAppAppearance();
    if (
      initialAppearance &&
      (initialAppearance === "neutral-light" ||
        initialAppearance === "neutral-dark" ||
        initialAppearance === "system")
    ) {
      this.appAppearanceId = initialAppearance;
    } else {
      this.appAppearanceId = "system";
    }

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

    if (this.sessionModeStore.isGuestMode) {
      if (guestVault.activeTheme?.id) {
        await this.setTheme(guestVault.activeTheme.id);
      }
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
    this.appAppearanceId = id;
    if (browser && !this.sessionModeStore.isDemoMode) {
      this.storage.saveAppAppearance(id);
    }
  }

  previewTheme(id: string | null) {
    this.previewThemeId = id as WorldThemeId | null;
  }

  private applyTheme(
    theme: StylingTemplate,
    appearance: ResolvedAppAppearanceId,
    appearanceChoice: AppAppearanceId,
  ) {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const tokens = theme.tokens;
    root.dataset.theme = theme.id;
    root.dataset.appAppearance = appearance;
    root.dataset.appAppearanceChoice = appearanceChoice;
    root.dataset.worldTheme = (
      this.previewThemeId || this.worldThemeId
    ).replace(/_(light|dark)$/, "");

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
    root.style.setProperty("--theme-title-ink", tokens.titleInk ?? tokens.text);
    root.style.setProperty(
      "--theme-section-title",
      tokens.sectionTitle ?? tokens.secondary,
    );
    root.style.setProperty(
      "--theme-meta-text",
      tokens.metaText ?? tokens.secondary,
    );
    root.style.setProperty(
      "--theme-icon-default",
      tokens.iconDefault ?? tokens.secondary,
    );
    root.style.setProperty(
      "--theme-icon-active",
      tokens.iconActive ?? tokens.primary,
    );
    root.style.setProperty("--theme-focus", tokens.focus ?? tokens.accent);
    root.style.setProperty(
      "--theme-panel-fill",
      tokens.panelFill ?? tokens.surface,
    );
    root.style.setProperty(
      "--theme-panel-muted",
      tokens.panelMuted ??
        `color-mix(in srgb, ${tokens.surface}, ${tokens.background} 28%)`,
    );
    root.style.setProperty(
      "--theme-selected-bg",
      tokens.selectedBg ??
        `color-mix(in srgb, ${tokens.primary}, ${tokens.background} 86%)`,
    );
    root.style.setProperty(
      "--theme-selected-border",
      tokens.selectedBorder ??
        `color-mix(in srgb, ${tokens.primary}, ${tokens.background} 42%)`,
    );
    root.style.setProperty(
      "--theme-focus-bg",
      tokens.focusBg ??
        `color-mix(in srgb, ${tokens.accent}, ${tokens.background} 84%)`,
    );
    root.style.setProperty(
      "--theme-focus-border",
      tokens.focusBorder ??
        `color-mix(in srgb, ${tokens.accent}, ${tokens.background} 42%)`,
    );
    root.style.setProperty(
      "--theme-action-bg",
      tokens.actionBg ?? tokens.primary,
    );
    root.style.setProperty(
      "--theme-action-hover",
      tokens.actionHover ?? tokens.secondary,
    );
    root.style.setProperty(
      "--theme-action-text",
      tokens.actionText ?? tokens.background,
    );

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
    root.style.setProperty(
      "--theme-edge-stroke-width",
      `${theme.graph.edgeWidth}px`,
    );

    // Theme specific visual behaviors
    let glow = "none";
    if (theme.id === "cyberpunk") glow = `0 0 15px ${tokens.primary}44`;
    if (theme.id === "horror") glow = `0 0 20px ${tokens.primary}33`;
    if (theme.id === "fantasy") glow = `0 0 14px ${tokens.accent}44`;
    // Phosphor bloom: neon green bleeds into surrounding glass like a real CRT tube
    if (theme.id === "fallout")
      glow = `0 0 18px ${tokens.primary}55, 0 0 6px ${tokens.primary}33`;
    root.style.setProperty("--theme-glow", glow);

    // Phosphor text-shadow for CRT header glow — bleeds light from characters into the screen glass
    let textGlow = "none";
    if (theme.id === "fallout")
      textGlow = `0 0 4px ${tokens.primary}80, 0 0 1px ${tokens.primary}`;
    root.style.setProperty("--theme-text-glow", textGlow);

    let radius = "2px"; // Gothic/Terminal default
    if (theme.id === "modern") radius = "12px";
    if (theme.id === "fantasy") radius = "3px"; // Firmer, less app-like fantasy
    if (theme.id === "horror") radius = "0px"; // Sharp corners for horror
    if (tokens.borderRadius) radius = tokens.borderRadius;
    root.style.setProperty("--theme-border-radius", radius);

    if (tokens.texture) {
      const alpha = tokens.textureOverlayAlpha ?? "80";
      root.style.setProperty(
        "--bg-texture",
        `url('/themes/${tokens.texture}')`,
      );
      // CRT vignette: radial dark-edge gradient layered above the scanline texture
      const vignette =
        theme.id === "fallout"
          ? `radial-gradient(ellipse at center, transparent 55%, ${tokens.background}CC 100%), `
          : "";
      root.style.setProperty(
        "--bg-texture-overlay",
        `${vignette}linear-gradient(${tokens.background}${alpha}, ${tokens.background}${alpha}), url('/themes/${tokens.texture}')`,
      );
      root.style.setProperty(
        "--theme-card-backdrop",
        tokens.textureCardBlur ? `blur(${tokens.textureCardBlur})` : "none",
      );
    } else {
      root.style.setProperty("--bg-texture", "none");
      root.style.setProperty("--bg-texture-overlay", "none");
      root.style.setProperty("--theme-card-backdrop", "none");
    }
  }
}

const THEME_KEY = "__codex_theme_instance__";
export const themeStore: ThemeStore =
  (globalThis as any)[THEME_KEY] ??
  ((globalThis as any)[THEME_KEY] = new ThemeStore());

if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as any).themeStore = themeStore;
}
