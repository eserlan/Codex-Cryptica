/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import GeneratorOutputCard from "./GeneratorOutputCard.svelte";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

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

describe("GeneratorOutputCard", () => {
  const sampleData: GeneratorOutput = {
    title: "Brotherhood of Hollow Crown",
    type: "faction",
    summary: "A necessary evil fallen order operating through a plague city.",
    content:
      "## What they control\n\nBrotherhood of Hollow Crown is a fallen order with real authority.",
    lore: "* Base: A secluded sanctuary.",
    status: "active",
    labels: ["dark-fantasy-faction", "grimdark"],
  };

  const sampleSections = [
    {
      id: "sec-1",
      heading: "What they control",
      markdown:
        "Brotherhood of Hollow Crown is a fallen order with real authority.",
      body: "Brotherhood of Hollow Crown is a fallen order with real authority.",
    },
  ];

  it("renders generated title, summary, and text-base typography container", () => {
    const { container } = render(GeneratorOutputCard, {
      props: {
        generatedData: sampleData,
        aiFallbackDismissed: false,
        isBusy: false,
        isExampleDraft: false,
        generatedSingular: "Faction",
        variant: "default",
        worldTheme: "Classic Fantasy",
        documentContent: sampleData.content,
        documentSections: sampleSections,
        copied: false,
        copiedSectionId: null,
        contextTrimmed: false,
        onDismissAiFallback: vi.fn(),
        onSaveToCodex: vi.fn(),
        onCopyMarkdown: vi.fn(),
        onCopySection: vi.fn(),
        onContainerClick: vi.fn(),
        onContainerKeydown: vi.fn(),
        onSelectHubEntity: vi.fn(),
        onSaveHubToCodex: vi.fn(),
      },
    });

    expect(screen.getByText("Brotherhood of Hollow Crown")).toBeTruthy();
    expect(
      screen.getByText(
        "A necessary evil fallen order operating through a plague city.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("What they control")).toBeTruthy();

    const seoMdContainer = container.querySelector(".seo-md");
    expect(seoMdContainer).toBeTruthy();
    expect(seoMdContainer?.classList.contains("text-base")).toBe(true);
    expect(seoMdContainer?.classList.contains("text-sm")).toBe(false);
  });
});
