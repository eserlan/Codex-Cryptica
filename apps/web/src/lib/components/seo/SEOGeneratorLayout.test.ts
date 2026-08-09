/** @vitest-environment jsdom */

import { render, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { tick, type Snippet } from "svelte";
import SEOGeneratorLayout from "./SEOGeneratorLayout.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { runShellCtaHandler } from "./marketing-shell";

const noopSnippet = (() => {}) as unknown as Snippet;

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/paths", () => ({
  base: "",
  resolve: (path: string) => path,
}));

const trackEventMock = vi.hoisted(() => vi.fn());
const trackPublicGeneratorActionMock = vi.hoisted(() => vi.fn());
vi.mock("$lib/services/analytics/zaraz-analytics", () => ({
  trackEvent: trackEventMock,
  trackPublicGeneratorAction: trackPublicGeneratorActionMock,
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

      await vi.waitFor(() => {
        expect(mockGenerate).toHaveBeenCalled();
        expect(
          [...document.querySelectorAll('script[type="application/ld+json"]')]
            .map((script) => JSON.parse(script.innerHTML))
            .some((schema) => schema["@type"] === "Person"),
        ).toBe(true);
      });

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

      await tick();
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

      await tick();
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
      expect(container.querySelector("[onerror]")).toBeNull();
      expect(container.querySelector('img[src="x"]')).toBeNull();
      expect(container.innerHTML).not.toContain("<script>alert(1)</script>");
      expect(container.textContent).toContain("Tone");
    });
  });

  describe("Generator funnel tracking (#1796)", () => {
    beforeEach(() => {
      trackEventMock.mockClear();
      trackPublicGeneratorActionMock.mockClear();
    });

    it("does not fire generator_started/generator_completed for the silent on-mount auto-draft", async () => {
      const mockGenerate = vi.fn().mockResolvedValue({
        type: "character",
        title: "Auto Draft",
        content: "auto",
        lore: "",
        labels: [],
        status: "draft",
      });

      render(SEOGeneratorLayout, {
        props: {
          canonicalPath: "/generators/npc",
          generate: mockGenerate,
          formFields: noopSnippet,
        },
      });

      await vi.waitFor(() => expect(mockGenerate).toHaveBeenCalled());

      expect(trackEventMock).not.toHaveBeenCalledWith(
        "generator_started",
        expect.anything(),
      );
      expect(trackEventMock).not.toHaveBeenCalledWith(
        "generator_completed",
        expect.anything(),
      );
    });

    it("fires generator_started then generator_completed on an explicit Generate click", async () => {
      const seedDraft = {
        type: "character" as const,
        title: "Seed",
        content: "seed",
        lore: "",
        labels: [],
        status: "draft" as const,
      };
      const mockGenerate = vi.fn().mockResolvedValue(seedDraft);

      const { container } = render(SEOGeneratorLayout, {
        props: {
          canonicalPath: "/generators/npc",
          generate: mockGenerate,
          formFields: noopSnippet,
          initialDraft: seedDraft,
        },
      });

      await tick();
      trackEventMock.mockClear();
      mockGenerate.mockClear();

      const button = container.querySelector(
        "#generate-button",
      ) as HTMLButtonElement;
      await fireEvent.click(button);
      await vi.waitFor(() => expect(mockGenerate).toHaveBeenCalled());

      expect(trackEventMock).toHaveBeenCalledWith("generator_started", {
        generator_type: "npc",
      });
      expect(trackEventMock).toHaveBeenCalledWith("generator_completed", {
        generator_type: "npc",
      });
    });

    it("tracks public Save, Copy, and Open Codex actions", async () => {
      const seedDraft = {
        type: "character" as const,
        title: "Seed",
        summary: "A useful NPC.",
        content: "### Who they are\nA useful NPC.",
        lore: "### Secret\nA secret.",
        labels: [],
        status: "draft" as const,
      };

      render(SEOGeneratorLayout, {
        props: {
          canonicalPath: "/generators/npc",
          generate: vi.fn().mockResolvedValue(seedDraft),
          formFields: noopSnippet,
          initialDraft: seedDraft,
        },
      });

      await tick();
      await fireEvent.click(document.querySelector("#copy-markdown-btn")!);
      await fireEvent.click(document.querySelector("#save-to-codex-btn")!);

      expect(trackPublicGeneratorActionMock).toHaveBeenCalledWith(
        "copy",
        expect.objectContaining({
          generator_type: "npc",
          copy_target: "markdown",
        }),
      );
      expect(trackPublicGeneratorActionMock).toHaveBeenCalledWith(
        "save_to_codex",
        expect.objectContaining({ generator_type: "npc" }),
      );

      // The header CTA is the shell's button now, so this layout registers its
      // tracking instead of binding it. Running the registered handler is what
      // the shell's onclick does.
      runShellCtaHandler();
      expect(trackPublicGeneratorActionMock).toHaveBeenCalledWith(
        "open_codex",
        expect.objectContaining({
          generator_type: "npc",
          source: "header",
        }),
      );
    });

    it("navigates in the same tab to Codex for the saved draft", async () => {
      const seedDraft = {
        type: "character" as const,
        title: "Seed",
        summary: "A useful NPC.",
        content: "### Who they are\nA useful NPC.",
        lore: "",
        labels: [],
        status: "draft" as const,
      };

      render(SEOGeneratorLayout, {
        props: {
          canonicalPath: "/generators/npc",
          generate: vi.fn().mockResolvedValue(seedDraft),
          formFields: noopSnippet,
          initialDraft: seedDraft,
        },
      });

      await tick();
      await fireEvent.click(document.querySelector("#save-to-codex-btn")!);

      const openCodexLink = document.querySelector(
        '[role="dialog"] a[href*="utm_medium=save-to-vault"]',
      );
      expect(openCodexLink).not.toBeUndefined();
      expect(openCodexLink?.getAttribute("href")).toContain(
        "utm_medium=save-to-vault",
      );

      await fireEvent.click(openCodexLink!);

      expect(trackPublicGeneratorActionMock).toHaveBeenCalledWith(
        "open_codex",
        expect.objectContaining({
          generator_type: "npc",
          source: "save_confirmation",
        }),
      );

      await fireEvent.click(document.querySelector("#save-to-codex-btn")!);
      const secondOpenCodexLink = document.querySelector(
        '[role="dialog"] a[href*="utm_medium=save-to-vault"]',
      );
      expect(secondOpenCodexLink).not.toBeUndefined();
      expect(secondOpenCodexLink?.getAttribute("href")).toContain(
        "utm_medium=save-to-vault",
      );

      await fireEvent.click(secondOpenCodexLink!);
    });
  });
});
