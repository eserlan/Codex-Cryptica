/** @vitest-environment jsdom */

import { render, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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

  describe("JSON-LD Schema Generation", () => {
    afterEach(() => {
      document.head.innerHTML = "";
    });

    it("generates and injects correct SoftwareApplication and BreadcrumbList schemas", () => {
      const mockGenerate = vi.fn().mockResolvedValue({});

      render(SEOGeneratorLayout, {
        props: {
          pageTitle: "RPG NPC Generator | Codex Cryptica",
          metaDescription: "Generate awesome characters.",
          canonicalPath: "/generators/npc",
          generate: mockGenerate,
          formFields: noopSnippet,
          faqs: [{ question: "FAQ Q1?", answer: "FAQ A1." }],
        },
      });

      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      let softwareAppFound = false;
      let breadcrumbFound = false;

      scripts.forEach((script) => {
        try {
          const json = JSON.parse(script.innerHTML);
          if (json["@type"] === "SoftwareApplication") {
            softwareAppFound = true;
            expect(json.name).toBe("Codex Cryptica");
            expect(json.mainEntity["@type"]).toBe("FAQPage");
            expect(json.mainEntity.mainEntity[0].name).toBe("FAQ Q1?");
          } else if (json["@type"] === "BreadcrumbList") {
            breadcrumbFound = true;
            expect(json.itemListElement).toHaveLength(3);
            expect(json.itemListElement[1].name).toBe("Generators");
            expect(json.itemListElement[2].name).toBe("RPG NPC Generator");
          }
        } catch {
          // ignore
        }
      });

      expect(softwareAppFound).toBe(true);
      expect(breadcrumbFound).toBe(true);
    });

    it("generates and injects correct Person/Place schemas when generatedData is set", async () => {
      const mockGenerate = vi.fn().mockResolvedValue({
        type: "character",
        title: "Initial Character Name",
        content: "Initial Character Bio description.",
        lore: "Some lore details.",
        labels: ["test-character"],
        status: "active",
      });

      render(SEOGeneratorLayout, {
        props: {
          pageTitle: "RPG NPC Generator | Codex Cryptica",
          metaDescription: "Generate awesome characters.",
          canonicalPath: "/generators/npc",
          generate: mockGenerate,
          formFields: noopSnippet,
          faqs: [],
        },
      });

      // Let mount effects run
      await new Promise((resolve) => setTimeout(resolve, 50));

      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      let personSchemaFound = false;

      scripts.forEach((script) => {
        try {
          const json = JSON.parse(script.innerHTML);
          if (json["@type"] === "Person") {
            personSchemaFound = true;
            expect(json.name).toBe("Initial Character Name");
            expect(json.description).toBe("Initial Character Bio description.");
            expect(json.knowsAbout).toEqual(["test-character"]);
          }
        } catch {
          // ignore
        }
      });

      expect(personSchemaFound).toBe(true);
    });
  });

  describe("Names variant rendering", () => {
    it("renders names as beautiful cards with copy buttons when variant is 'names'", () => {
      const mockGenerate = vi.fn().mockResolvedValue({});
      const initialDraft = {
        type: "character" as const,
        title: "Test Names",
        content: "- **Iridian Vespera**: A nomadic chronicler.",
        lore: "",
        labels: ["rpg-names"],
        status: "draft" as const,
      };

      const { container } = render(SEOGeneratorLayout, {
        props: {
          pageTitle: "Names Generator",
          metaDescription: "Generate names.",
          canonicalPath: "/tools/fantasy-name-generator",
          generate: mockGenerate,
          formFields: noopSnippet,
          initialDraft,
          variant: "names",
        },
      });

      // It should render a card div
      const card = container.querySelector(".group.relative.flex.flex-col");
      expect(card).toBeTruthy();

      // The name should be rendered with font-header
      const nameSpan = card?.querySelector(
        ".font-header.font-bold.text-theme-primary",
      );
      expect(nameSpan).toBeTruthy();
      expect(nameSpan?.textContent?.trim()).toBe("Iridian Vespera");

      // The copy button should have copy icon and the data-copy-text attribute
      const copyBtn = card?.querySelector(
        "button[data-copy-text='Iridian Vespera']",
      );
      expect(copyBtn).toBeTruthy();
      expect(copyBtn?.querySelector(".icon-\\[lucide--copy\\]")).toBeTruthy();
    });
  });

  describe("Offline Local Mode gating (#1494)", () => {
    const originalOnLine = Object.getOwnPropertyDescriptor(
      window.navigator,
      "onLine",
    );

    afterEach(() => {
      if (originalOnLine) {
        Object.defineProperty(window.navigator, "onLine", originalOnLine);
      }
    });

    function setOnline(value: boolean) {
      Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        value,
      });
    }

    // Provide an initialDraft so the on-mount auto-generate short-circuits and
    // we only observe the explicit Generate-button call.
    const seedDraft = {
      type: "character" as const,
      title: "Seed",
      content: "seed",
      lore: "",
      labels: [],
      status: "draft" as const,
    };

    it("forces useAI:false when offline even if the AI toggle is on", async () => {
      setOnline(false);
      const mockGenerate = vi.fn().mockResolvedValue(seedDraft);

      const { container } = render(SEOGeneratorLayout, {
        props: {
          generate: mockGenerate,
          formFields: noopSnippet,
          initialDraft: seedDraft,
        },
      });

      // Let onMount sync isOnline from navigator.onLine.
      await new Promise((resolve) => setTimeout(resolve, 50));
      mockGenerate.mockClear();

      const button = container.querySelector(
        "#generate-button",
      ) as HTMLButtonElement;
      await fireEvent.click(button);

      expect(mockGenerate).toHaveBeenCalledWith({ useAI: false });
    });

    it("uses AI when online and the AI toggle is on (default)", async () => {
      setOnline(true);
      const mockGenerate = vi.fn().mockResolvedValue(seedDraft);

      const { container } = render(SEOGeneratorLayout, {
        props: {
          generate: mockGenerate,
          formFields: noopSnippet,
          initialDraft: seedDraft,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      mockGenerate.mockClear();

      const button = container.querySelector(
        "#generate-button",
      ) as HTMLButtonElement;
      await fireEvent.click(button);

      expect(mockGenerate).toHaveBeenCalledWith({ useAI: true });
    });
  });

  describe("Generated content sanitization", () => {
    it("sanitizes unsafe HTML from generated content before rendering", () => {
      const mockGenerate = vi.fn().mockResolvedValue({});
      const initialDraft = {
        type: "character" as const,
        title: "Unsafe Draft",
        content:
          '- **Tone**: <img src="x" onerror="alert(1)"><script>alert(1)</script>',
        lore: "",
        labels: ["security"],
        status: "draft" as const,
      };

      const { container } = render(SEOGeneratorLayout, {
        props: {
          pageTitle: "Security Test",
          metaDescription: "Security test.",
          canonicalPath: "/generators/npc",
          generate: mockGenerate,
          formFields: noopSnippet,
          initialDraft,
        },
      });

      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector("[onerror]")).toBeNull();
      expect(container.innerHTML).not.toContain("<script>alert(1)</script>");
      expect(container.textContent).toContain("Tone");
    });
  });
});
