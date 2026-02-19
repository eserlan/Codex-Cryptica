import { describe, it, expect, beforeEach } from "vitest";
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
