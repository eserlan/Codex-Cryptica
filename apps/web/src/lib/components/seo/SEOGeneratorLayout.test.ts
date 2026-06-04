/** @vitest-environment jsdom */

import { render } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Snippet } from "svelte";
import SEOGeneratorLayout from "./SEOGeneratorLayout.svelte";
import { themeStore } from "$lib/stores/theme.svelte";

const noopSnippet = (() => {}) as unknown as Snippet;

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

// Stub Element.prototype.animate for JSDOM / Svelte 5 transitions compatibility
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () => {
    return {
      cancel: () => {},
      finish: () => {},
      pause: () => {},
      play: () => {},
      reverse: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any;
  };
}

describe("SEOGeneratorLayout Theming Sync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls themeStore.setTheme when isThemeCustomizable is true and theme changes", async () => {
    const setThemeSpy = vi
      .spyOn(themeStore, "setTheme")
      .mockResolvedValue(undefined);

    // Set themeStore initial value
    themeStore.currentThemeId = "workspace";

    // Set up a mock generate function
    const mockGenerate = vi.fn().mockResolvedValue({
      title: "Test Title",
      type: "Faction",
      content: "Test Content",
      lore: "Test Lore",
      labels: [],
      status: "draft",
    });

    const { rerender } = render(SEOGeneratorLayout, {
      props: {
        theme: "Classic Fantasy",
        isThemeCustomizable: true,
        generate: mockGenerate,
        formFields: noopSnippet,
      },
    });

    // Initial check: activeThemeId for "Classic Fantasy" is "fantasy"
    // Since themeStore.worldThemeId was "workspace", it should trigger setTheme("fantasy")
    expect(setThemeSpy).toHaveBeenCalledWith("fantasy");

    setThemeSpy.mockClear();

    // Rerender with a new theme: "Cyberpunk / Corporate" (maps to "cyberpunk")
    await rerender({
      theme: "Cyberpunk / Corporate",
      isThemeCustomizable: true,
      generate: mockGenerate,
      formFields: noopSnippet,
    });

    expect(setThemeSpy).toHaveBeenCalledWith("cyberpunk");
  });

  it("does NOT call themeStore.setTheme when isThemeCustomizable is false", async () => {
    themeStore.currentThemeId = "workspace";
    const setThemeSpy = vi
      .spyOn(themeStore, "setTheme")
      .mockResolvedValue(undefined);

    const mockGenerate = vi.fn().mockResolvedValue({});

    const { rerender } = render(SEOGeneratorLayout, {
      props: {
        theme: "Classic Fantasy",
        isThemeCustomizable: false,
        generate: mockGenerate,
        formFields: noopSnippet,
      },
    });

    expect(setThemeSpy).not.toHaveBeenCalled();

    // Rerender with a new theme
    await rerender({
      theme: "Cyberpunk / Corporate",
      isThemeCustomizable: false,
      generate: mockGenerate,
      formFields: noopSnippet,
    });

    expect(setThemeSpy).not.toHaveBeenCalled();
  });
});
