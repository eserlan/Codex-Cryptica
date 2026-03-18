import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
}));

import { themeStore } from "./theme.svelte";
import { DEFAULT_JARGON } from "schema";

describe("ThemeStore Jargon", () => {
  beforeEach(() => {
    themeStore.setTheme("fantasy");
    themeStore.previewTheme(null);
  });

  it("should provide default jargon when no theme jargon is defined", () => {
    // Modern theme currently has no jargon defined
    themeStore.setTheme("modern");
    expect(themeStore.jargon.vault).toBe(DEFAULT_JARGON.vault);
    expect(themeStore.resolveJargon("save")).toBe(DEFAULT_JARGON.save);
  });

  it("should provide theme-specific jargon when defined", () => {
    themeStore.setTheme("fantasy");
    expect(themeStore.jargon.vault).toBe("Archive");
    expect(themeStore.jargon.lore_header).toBe("Ancient Inscription");
    expect(themeStore.jargon.tab_status).toBe("Attributes");
    expect(themeStore.resolveJargon("save")).toBe("Inscribe");
  });

  it("should handle pluralization correctly", () => {
    themeStore.setTheme("fantasy");
    // Fantasy entity is "Chronicle", plural "Chronicles"
    expect(themeStore.resolveJargon("entity", 1)).toBe("Chronicle");
    expect(themeStore.resolveJargon("entity", 5)).toBe("Chronicles");
    expect(themeStore.resolveJargon("entity", 0)).toBe("Chronicles");
  });

  it("should fallback to singular if plural key is missing", () => {
    themeStore.setTheme("modern");
    // If we only have 'save' and ask for 'save_plural' (not that we would),
    // but testing the fallback logic in resolveJargon
    expect(themeStore.resolveJargon("save", 5)).toBe("Save");
  });
});

describe("ThemeStore Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    themeStore.setTheme("fantasy");
  });

  it("should save theme to localStorage", () => {
    themeStore.setTheme("scifi");
    expect(localStorage.getItem("codex-cryptica-active-theme")).toBe("scifi");
  });

  it("should use localStorage on init if no vault active", async () => {
    localStorage.setItem("codex-cryptica-active-theme", "cyberpunk");
    await themeStore.init();
    expect(themeStore.currentThemeId).toBe("cyberpunk");
  });

  it("should load vault-specific theme and update localStorage", async () => {
    const { getDB } = await import("../utils/idb");
    const db = await getDB();
    await db.put("settings", "modern", "theme_my-vault");

    // Set to scifi first
    await themeStore.setTheme("scifi");

    await themeStore.loadForVault("my-vault");

    expect(themeStore.currentThemeId).toBe("modern");
    expect(localStorage.getItem("codex-cryptica-active-theme")).toBe("modern");
  });

  it("should NOT reset to default if vault theme is missing", async () => {
    // Set to cyberpunk first
    await themeStore.setTheme("cyberpunk");

    // Load for a vault that doesn't exist/has no theme
    await themeStore.loadForVault("non-existent");

    expect(themeStore.currentThemeId).toBe("cyberpunk");
    expect(localStorage.getItem("codex-cryptica-active-theme")).toBe(
      "cyberpunk",
    );
  });
});
