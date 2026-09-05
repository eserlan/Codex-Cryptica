import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThemeStore, type IThemeStorage } from "./theme.svelte";
import { DEFAULT_JARGON } from "schema";

vi.mock("$app/environment", () => ({
  browser: true,
}));

describe("ThemeStore", () => {
  let store: ThemeStore;
  let mockStorage: IThemeStorage;
  let mockUiStore: any;

  beforeEach(() => {
    mockStorage = {
      loadLocal: vi.fn().mockReturnValue(null),
      saveLocal: vi.fn(),
      loadAppAppearance: vi.fn().mockReturnValue(null),
      saveAppAppearance: vi.fn(),
      loadFromCache: vi.fn().mockResolvedValue(null),
      saveToCache: vi.fn().mockResolvedValue(undefined),
      loadFromDisk: vi.fn().mockResolvedValue(null),
      saveToDisk: vi.fn().mockResolvedValue(undefined),
    };
    mockUiStore = { isDemoMode: false };
    const mockVaultGetter = () => ({ activeVaultId: "v1" });

    // Mock window.matchMedia
    if (typeof window !== "undefined") {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    }

    store = new ThemeStore(mockUiStore as any, mockVaultGetter, mockStorage);
  });

  describe("Foundation Split Initial State", () => {
    it("should default appAppearanceId to system, and resolvedAppAppearanceId to dark (since mocked matchMedia matches dark)", () => {
      expect(store.appAppearanceId).toBe("system");
      expect(store.resolvedAppAppearanceId).toBe("neutral-dark");
    });

    it("should default worldThemeId to workspace", () => {
      expect(store.worldThemeId).toBe("workspace");
    });

    it("should have currentThemeId alias get/set worldThemeId", async () => {
      expect(store.currentThemeId).toBe("workspace");
      await store.setTheme("fantasy");
      expect(store.worldThemeId).toBe("fantasy");
      expect(store.currentThemeId).toBe("fantasy");
    });

    it("should fall back old codex-cryptica-active-theme values as worldThemeId only and not set app appearance", () => {
      mockStorage.loadLocal = vi.fn().mockReturnValue("scifi");
      mockStorage.loadAppAppearance = vi.fn().mockReturnValue(null);

      const newStore = new ThemeStore(
        mockUiStore as any,
        () => ({ activeVaultId: "v1" }),
        mockStorage,
      );
      expect(newStore.worldThemeId).toBe("scifi");
      expect(newStore.appAppearanceId).toBe("system");
    });
  });

  describe("Jargon", () => {
    it("should resolve jargon correctly for fantasy theme", async () => {
      await store.setTheme("fantasy");
      expect(store.resolveJargon("entity")).toBe("Chronicle");
    });

    it("should resolve plural jargon", async () => {
      await store.setTheme("fantasy");
      expect(store.resolveJargon("entity", 2)).toBe("Chronicles");
    });

    it("should fallback to default jargon if theme doesn't define it", async () => {
      await store.setTheme("modern");
      expect(store.resolveJargon("entity")).toBe(DEFAULT_JARGON.entity);
    });

    it("should use preview theme jargon if available", async () => {
      await store.setTheme("modern");
      vi.mocked(mockStorage.saveLocal).mockClear();
      store.previewTheme("fantasy");
      expect(store.resolveJargon("entity")).toBe("Chronicle");
      expect(store.worldThemeId).toBe("modern");
      expect(mockStorage.saveLocal).not.toHaveBeenCalled();
    });
  });

  describe("Persistence", () => {
    it("should load world theme from disk if available", async () => {
      mockStorage.loadFromDisk = vi.fn().mockResolvedValue("scifi");
      await store.loadForVault("v1");
      expect(store.worldThemeId).toBe("scifi");
      expect(mockStorage.saveLocal).toHaveBeenCalledWith("scifi");
    });

    it("should fallback to cache if disk is missing", async () => {
      mockStorage.loadFromDisk = vi.fn().mockResolvedValue(null);
      mockStorage.loadFromCache = vi.fn().mockResolvedValue("horror");
      await store.loadForVault("v1");
      expect(store.worldThemeId).toBe("horror");
    });

    it("should report no saved vault theme when disk and cache are missing", async () => {
      expect(await store.hasSavedThemeForVault("v1")).toBe(false);
    });

    it("should report a saved vault theme from disk", async () => {
      mockStorage.loadFromDisk = vi.fn().mockResolvedValue("scifi");

      expect(await store.hasSavedThemeForVault("v1")).toBe(true);
      expect(mockStorage.loadFromCache).not.toHaveBeenCalled();
    });

    it("should report a saved vault theme from cache when disk is missing", async () => {
      mockStorage.loadFromDisk = vi.fn().mockResolvedValue(null);
      mockStorage.loadFromCache = vi.fn().mockResolvedValue("horror");

      expect(await store.hasSavedThemeForVault("v1")).toBe(true);
    });

    it("should save to cache and disk on setTheme", async () => {
      await store.setTheme("cyberpunk");
      expect(store.worldThemeId).toBe("cyberpunk");
      expect(mockStorage.saveLocal).toHaveBeenCalledWith("cyberpunk");
      expect(mockStorage.saveToCache).toHaveBeenCalledWith("v1", "cyberpunk");
      expect(mockStorage.saveToDisk).toHaveBeenCalledWith("v1", "cyberpunk");
    });

    it("should persist app appearance separately", () => {
      store.setAppAppearance("neutral-light");
      expect(store.appAppearanceId).toBe("neutral-light");
      expect(store.resolvedAppAppearanceId).toBe("neutral-light");
      expect(mockStorage.saveAppAppearance).toHaveBeenCalledWith(
        "neutral-light",
      );
    });
  });

  describe("Dynamic Theme Resolution", () => {
    it("should resolve workspace to workspace_dark when appearance is neutral-dark", async () => {
      store.setAppAppearance("neutral-dark");
      await store.setTheme("workspace");
      expect(store.activeTheme.id).toBe("workspace_dark");
    });

    it("should resolve workspace_dark to workspace when appearance is neutral-light", async () => {
      store.setAppAppearance("neutral-light");
      await store.setTheme("workspace_dark" as any);
      expect(store.activeTheme.id).toBe("workspace");
    });

    it("should resolve light world themes to dark variants in neutral-dark", async () => {
      store.setAppAppearance("neutral-dark");

      await store.setTheme("fantasy");
      expect(store.activeTheme.id).toBe("fantasy_dark");

      await store.setTheme("modern");
      expect(store.activeTheme.id).toBe("modern_dark");
    });

    it("should resolve dark world themes to light variants in neutral-light", async () => {
      store.setAppAppearance("neutral-light");

      const darkThemes = [
        "scifi",
        "cyberpunk",
        "apocalyptic",
        "horror",
        "cosmic_horror",
        "fallout",
        "starwars",
        "startrek",
      ];
      for (const id of darkThemes) {
        await store.setTheme(id);
        expect(store.activeTheme.id).toBe(`${id}_light`);
      }
    });

    it("should resolve horror to horror_light with Archival Dossier tokens in neutral-light", async () => {
      store.setAppAppearance("neutral-light");
      await store.setTheme("horror");

      expect(store.activeTheme.id).toBe("horror_light");
      expect(store.activeTheme.tokens.primary).toBe("#801414");
      expect(store.activeTheme.tokens.background).toBe("#e4dfd5");
      expect(store.activeTheme.tokens.accent).toBe("#801414");
    });

    it("keeps cosmic horror separate from the gothic-noir horror theme", async () => {
      store.setAppAppearance("neutral-dark");
      await store.setTheme("cosmic_horror");

      expect(store.activeTheme.name).toBe("Cosmic Horror");
      expect(store.activeTheme.description).toContain("impossible geometry");
      expect(store.activeTheme.description).not.toContain("vampires");
    });

    it("should keep natively light themes as light in neutral-light, and natively dark as dark in neutral-dark", async () => {
      store.setAppAppearance("neutral-light");
      await store.setTheme("fantasy");
      expect(store.activeTheme.id).toBe("fantasy");

      store.setAppAppearance("neutral-dark");
      await store.setTheme("scifi");
      expect(store.activeTheme.id).toBe("scifi");
    });
  });

  describe("Semantic Contrast Tokens & Fantasy Dark Mode", () => {
    it("should apply accessible metaText and semantic tokens to documentElement when in fantasy_dark", async () => {
      store.setAppAppearance("neutral-dark");
      await store.setTheme("fantasy");

      expect(store.activeTheme.id).toBe("fantasy_dark");
      const root = document.documentElement;

      // Primary body text and muted text
      expect(root.style.getPropertyValue("--color-text-primary")).toBe(
        "#e8ddc4",
      );
      expect(root.style.getPropertyValue("--color-text-muted")).toBe("#bfa68b");
      expect(root.style.getPropertyValue("--color-text-dim")).toBe("#bfa68b");

      // Semantic tokens
      expect(root.style.getPropertyValue("--text-primary")).toBe("#f1eee5");
      expect(root.style.getPropertyValue("--text-secondary")).toBe("#d4a85a");
      expect(root.style.getPropertyValue("--text-muted")).toBe("#bfa68b");
      expect(root.style.getPropertyValue("--link")).toBe("#d4a85a");
      expect(root.style.getPropertyValue("--icon-interactive")).toBe("#d4a85a");
      expect(root.style.getPropertyValue("--border-interactive")).toBe(
        "#d4a85a",
      );
    });

    it("should fall back to tokens.secondary for --color-text-muted when metaText is not provided", async () => {
      store.setAppAppearance("neutral-light");
      await store.setTheme("workspace");

      const root = document.documentElement;
      expect(root.style.getPropertyValue("--color-text-muted")).toBe("#78716c");
      expect(root.style.getPropertyValue("--text-muted")).toBe("#78716c");
    });
  });
});
