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
      loadFromCache: vi.fn().mockResolvedValue(null),
      saveToCache: vi.fn().mockResolvedValue(undefined),
      loadFromDisk: vi.fn().mockResolvedValue(null),
      saveToDisk: vi.fn().mockResolvedValue(undefined),
    };
    mockUiStore = { isDemoMode: false };
    const mockVaultGetter = () => ({ activeVaultId: "v1" });
    store = new ThemeStore(mockUiStore as any, mockVaultGetter, mockStorage);
  });

  describe("Jargon", () => {
    it("should resolve jargon correctly for fantasy theme", () => {
      store.currentThemeId = "fantasy";
      expect(store.resolveJargon("entity")).toBe("Chronicle");
    });

    it("should resolve plural jargon", () => {
      store.currentThemeId = "fantasy";
      expect(store.resolveJargon("entity", 2)).toBe("Chronicles");
    });

    it("should fallback to default jargon if theme doesn't define it", () => {
      store.currentThemeId = "modern";
      expect(store.resolveJargon("entity")).toBe(DEFAULT_JARGON.entity);
    });

    it("should use preview theme jargon if available", () => {
      store.currentThemeId = "modern";
      store.previewTheme("fantasy");
      expect(store.resolveJargon("entity")).toBe("Chronicle");
      expect(store.currentThemeId).toBe("modern");
      expect(mockStorage.saveLocal).not.toHaveBeenCalled();
    });
  });

  describe("Persistence", () => {
    it("should load theme from disk if available", async () => {
      mockStorage.loadFromDisk = vi.fn().mockResolvedValue("scifi");
      await store.loadForVault("v1");
      expect(store.currentThemeId).toBe("scifi");
      expect(mockStorage.saveLocal).toHaveBeenCalledWith("scifi");
    });

    it("should fallback to cache if disk is missing", async () => {
      mockStorage.loadFromDisk = vi.fn().mockResolvedValue(null);
      mockStorage.loadFromCache = vi.fn().mockResolvedValue("horror");
      await store.loadForVault("v1");
      expect(store.currentThemeId).toBe("horror");
    });

    it("should save to both cache and disk on setTheme", async () => {
      await store.setTheme("cyberpunk");
      expect(store.currentThemeId).toBe("cyberpunk");
      expect(mockStorage.saveLocal).toHaveBeenCalledWith("cyberpunk");
      expect(mockStorage.saveToCache).toHaveBeenCalledWith("v1", "cyberpunk");
      expect(mockStorage.saveToDisk).toHaveBeenCalledWith("v1", "cyberpunk");
    });
  });
});
