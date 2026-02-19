import { THEMES, DEFAULT_THEME } from "schema";
import type { StylingTemplate } from "schema";
import { browser } from "$app/environment";

const STORAGE_KEY = "codex-cryptica-active-theme";

class ThemeStore {
  currentThemeId = $state(DEFAULT_THEME.id);
  previewThemeId = $state<string | null>(null);

  activeTheme = $derived(
    this.previewThemeId
      ? THEMES[this.previewThemeId]
      : THEMES[this.currentThemeId] || DEFAULT_THEME,
  );

  constructor() {
    $effect.root(() => {
      $effect(() => {
        this.applyTheme(this.activeTheme);
      });
    });
  }

  init() {
    if (browser) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && THEMES[stored]) {
        this.currentThemeId = stored;
      }
    }
  }

  setTheme(id: string) {
    if (THEMES[id]) {
      this.currentThemeId = id;
      if (browser) {
        localStorage.setItem(STORAGE_KEY, id);
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
    if (theme.id === "horror") glow = `0 0 20px ${tokens.secondary}33`;
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
        "--bg-texture",
        `url('/themes/${tokens.texture}')`,
      );
      root.style.setProperty(
        "--bg-texture",
        `url('/themes/${tokens.texture}')`,
      );
      // Reduced overlay opacity from 0.9 to 0.7 to let texture show through (100% - 30% = 70% opacity mask)
      // Actually, let's use a lower opacity for the solid color covering the texture.
      // 0.9 covers 90%. We want maybe 70% coverage max?
      // But the background color is the parchment color.
      // If we want the texture (which is dark grain) to show on top of background,
      // we should probably layer it: Background Color -> Texture Image -> Slight Gradient Tint?
      // Current implementation: background-image = --bg-texture (which is just the SVG).
      // Body has background-color (solid).
      // So Body = Solid Color + SVG.
      //
      // But 'surface' elements usually have their own background-color (tokens.surface), which sits ON TOP of body.
      // So panels are opaque.

      // We need panels to ALSO have the texture if we want them to look like paper.
      // Let's first fix the overlay variable to be more transparent so it doesn't wash things out if used.
      root.style.setProperty(
        "--bg-texture-overlay",
        `linear-gradient(rgba(253, 246, 227, 0.5), rgba(253, 246, 227, 0.5)), url('/themes/${tokens.texture}')`,
      );
    } else {
      root.style.setProperty("--bg-texture", "none");
      root.style.setProperty("--bg-texture-overlay", "none");
    }
  }
}

export const themeStore = new ThemeStore();
