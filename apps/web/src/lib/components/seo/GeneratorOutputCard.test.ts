/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
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

  it("renders Generate Roster and per-member Open as Character with interpolated aria-labels (#2808)", () => {
    const rosterData: GeneratorOutput = {
      title: "The Compact's Inner Circle",
      type: "note",
      summary: "Two notable members of The Compact.",
      content: "### Vess Marrow — Quartermaster\n- **Duty**: Moves cargo.",
      lore: "### At a Glance\n- **Structure**: Council",
      status: "active",
      labels: ["faction-roster", "faction-roster-generator"],
    };
    const rosterSections = [
      {
        id: "vess-marrow-quartermaster-0",
        heading: "Vess Marrow — Quartermaster",
        markdown: "### Vess Marrow — Quartermaster\n- **Duty**: Moves cargo.",
        body: "- **Duty**: Moves cargo.",
      },
    ];

    render(GeneratorOutputCard, {
      props: {
        generatedData: rosterData,
        aiFallbackDismissed: false,
        isBusy: false,
        isExampleDraft: false,
        generatedSingular: "Faction Roster",
        variant: "default",
        worldTheme: "Classic Fantasy",
        documentContent: rosterData.content,
        documentSections: rosterSections,
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
        onOpenMemberAsCharacter: vi.fn(),
      },
    });

    // The aria-label must interpolate the actual member heading, not the
    // literal template text — this is the same interpolation pattern the
    // pre-existing "Copy MD" button already uses successfully.
    expect(
      screen.getByLabelText("Open Vess Marrow — Quartermaster as a Character"),
    ).toBeTruthy();
  });

  it("shows Generate Roster for a faction-family draft when onGenerateRoster is provided", () => {
    // sampleData carries the "dark-fantasy-faction" label, one of the
    // faction-family labels isFactionDraft() recognizes.
    render(GeneratorOutputCard, {
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
        onGenerateRoster: vi.fn(),
      },
    });

    expect(
      screen.getByRole("button", { name: /generate roster/i }),
    ).toBeTruthy();
  });

  it("exposes the shared refinement action for a completed draft", async () => {
    const onRefine = vi.fn();
    render(GeneratorOutputCard, {
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
        onRefine,
        onCopyMarkdown: vi.fn(),
        onCopySection: vi.fn(),
        onContainerClick: vi.fn(),
        onContainerKeydown: vi.fn(),
        onSelectHubEntity: vi.fn(),
        onSaveHubToCodex: vi.fn(),
      },
    });

    await fireEvent.click(screen.getByRole("button", { name: /refine/i }));
    expect(onRefine).toHaveBeenCalledWith(sampleData);
  });

  it("hides Generate Roster for a non-faction draft even when onGenerateRoster is provided", () => {
    const npcData: GeneratorOutput = {
      ...sampleData,
      labels: ["npc-generator", "rpg-npc"],
    };
    render(GeneratorOutputCard, {
      props: {
        generatedData: npcData,
        aiFallbackDismissed: false,
        isBusy: false,
        isExampleDraft: false,
        generatedSingular: "NPC",
        variant: "default",
        worldTheme: "Classic Fantasy",
        documentContent: npcData.content,
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
        onGenerateRoster: vi.fn(),
      },
    });

    expect(
      screen.queryByRole("button", { name: /generate roster/i }),
    ).toBeNull();
  });

  it("shows Create D&D Monster for a creature draft when onSendToMonsterLabs is provided", () => {
    const creatureData: GeneratorOutput = {
      ...sampleData,
      type: "creature",
      labels: ["rpg-creature"],
    };
    const onSendToMonsterLabs = vi.fn();
    render(GeneratorOutputCard, {
      props: {
        generatedData: creatureData,
        aiFallbackDismissed: false,
        isBusy: false,
        isExampleDraft: false,
        generatedSingular: "Creature",
        variant: "default",
        worldTheme: "Classic Fantasy",
        documentContent: creatureData.content,
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
        onSendToMonsterLabs,
      },
    });

    const button = screen.getByRole("button", {
      name: /create d&d monster/i,
    });
    expect(button).toBeTruthy();
  });

  it("hides Create D&D Monster for a non character/creature draft even when onSendToMonsterLabs is provided", () => {
    render(GeneratorOutputCard, {
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
        onSendToMonsterLabs: vi.fn(),
      },
    });

    expect(
      screen.queryByRole("button", { name: /create d&d monster/i }),
    ).toBeNull();
  });

  it("calls onSendToMonsterLabs with the current draft when clicked", async () => {
    const creatureData: GeneratorOutput = {
      ...sampleData,
      type: "character",
      labels: [],
    };
    const onSendToMonsterLabs = vi.fn();
    render(GeneratorOutputCard, {
      props: {
        generatedData: creatureData,
        aiFallbackDismissed: false,
        isBusy: false,
        isExampleDraft: false,
        generatedSingular: "Character",
        variant: "default",
        worldTheme: "Classic Fantasy",
        documentContent: creatureData.content,
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
        onSendToMonsterLabs,
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: /create d&d monster/i }),
    );

    expect(onSendToMonsterLabs).toHaveBeenCalledWith(creatureData);
  });
});
