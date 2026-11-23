/** @vitest-environment jsdom */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  DEFAULT_JARGON,
  DEFAULT_THEME,
  FANTASY_DARK,
  SCIFI_LIGHT,
  THEMES,
  WORKSPACE_DARK,
} from "schema";
import {
  APPEARANCE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  applyPublicThemePreview,
  applyThemeTokensToDocument,
  readStoredAppearanceChoice,
  readStoredWorldThemeId,
  resolveAppAppearance,
  resolveStylingTemplate,
  resolveThemeJargon,
} from "./theme-dom";

describe("theme-dom", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-world-theme");
    document.documentElement.removeAttribute("data-app-appearance");
    document.documentElement.removeAttribute("data-app-appearance-choice");
    document.documentElement.style.cssText = "";
  });

  it("resolves light and dark styling template variants and falls back to DEFAULT_THEME on invalid ids", () => {
    expect(resolveStylingTemplate("workspace", "neutral-light").id).toBe(
      THEMES.workspace.id,
    );
    expect(resolveStylingTemplate("workspace", "neutral-dark").id).toBe(
      WORKSPACE_DARK.id,
    );
    expect(resolveStylingTemplate("fantasy", "neutral-dark").id).toBe(
      FANTASY_DARK.id,
    );
    expect(resolveStylingTemplate("scifi", "neutral-light").id).toBe(
      SCIFI_LIGHT.id,
    );
    expect(
      resolveStylingTemplate("space-opera-resistance", "neutral-dark").id,
    ).toBe("space-opera-resistance_dark");
    expect(resolveStylingTemplate("space-western", "neutral-light").id).toBe(
      "space-western_light",
    );
    expect(
      resolveStylingTemplate("nonexistent-theme", "neutral-light").id,
    ).toBe(DEFAULT_THEME.id);
    expect(resolveStylingTemplate(null, "neutral-light").id).toBe(
      DEFAULT_THEME.id,
    );
  });

  it("resolves app appearance choices against system dark preference", () => {
    expect(resolveAppAppearance("system", true)).toBe("neutral-dark");
    expect(resolveAppAppearance("system", false)).toBe("neutral-light");
    expect(resolveAppAppearance("neutral-dark", false)).toBe("neutral-dark");
    expect(resolveAppAppearance("neutral-light", true)).toBe("neutral-light");
  });

  it("applies public theme preview dataset and CSS variables without writing localStorage", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    applyPublicThemePreview("pirate", "neutral-dark", "neutral-dark");

    const root = document.documentElement;
    expect(root.dataset.worldTheme).toBe("pirate");
    expect(root.dataset.theme).toBe("pirate_dark");
    expect(root.dataset.appAppearance).toBe("neutral-dark");
    expect(root.dataset.appAppearanceChoice).toBe("neutral-dark");
    expect(root.style.getPropertyValue("--color-accent-primary")).toBe(
      resolveStylingTemplate("pirate", "neutral-dark").tokens.primary,
    );
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(setItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
  });

  it("falls back to DEFAULT_THEME for invalid preview themes", () => {
    applyPublicThemePreview("invalid_genre", "neutral-light", "neutral-light");

    expect(document.documentElement.dataset.worldTheme).toBe(DEFAULT_THEME.id);
    expect(document.documentElement.dataset.theme).toBe(DEFAULT_THEME.id);
  });

  it("is a safe no-op when document is unavailable", () => {
    vi.stubGlobal("document", undefined);
    try {
      expect(() =>
        applyThemeTokensToDocument({
          theme: DEFAULT_THEME,
          worldThemeId: "workspace",
          appearance: "neutral-light",
          appearanceChoice: "system",
        }),
      ).not.toThrow();
      expect(() =>
        applyPublicThemePreview("pirate", "system", "neutral-light"),
      ).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("resolves singular, plural, and fallback jargon for a theme id", () => {
    expect(resolveThemeJargon("fantasy", "entity")).toBe("Chronicle");
    expect(resolveThemeJargon("fantasy", "entity", 2)).toBe("Chronicles");
    expect(resolveThemeJargon("modern", "entity")).toBe(DEFAULT_JARGON.entity);
    expect(resolveThemeJargon(null, "blog_action")).toBe(
      DEFAULT_JARGON.blog_action,
    );
  });

  it("reads stored world theme ids with suffix normalization, prototype-key rejection, and throwing storage fallback", () => {
    expect(readStoredWorldThemeId({ getItem: () => "fantasy_dark" })).toBe(
      "fantasy",
    );
    expect(readStoredWorldThemeId({ getItem: () => "scifi_light" })).toBe(
      "scifi",
    );
    expect(readStoredWorldThemeId({ getItem: () => "__proto__" })).toBe(
      DEFAULT_THEME.id,
    );
    expect(readStoredWorldThemeId({ getItem: () => "constructor" })).toBe(
      DEFAULT_THEME.id,
    );
    expect(
      readStoredWorldThemeId({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe(DEFAULT_THEME.id);
    expect(readStoredWorldThemeId(null)).toBe(DEFAULT_THEME.id);
  });

  it("reads stored appearance choices with validation and throwing storage fallback", () => {
    expect(
      readStoredAppearanceChoice({
        getItem: (k) => (k === APPEARANCE_STORAGE_KEY ? "neutral-dark" : null),
      }),
    ).toBe("neutral-dark");
    expect(readStoredAppearanceChoice({ getItem: () => "neutral-light" })).toBe(
      "neutral-light",
    );
    expect(readStoredAppearanceChoice({ getItem: () => "invalid" })).toBe(
      "system",
    );
    expect(
      readStoredAppearanceChoice({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe("system");
  });
});
