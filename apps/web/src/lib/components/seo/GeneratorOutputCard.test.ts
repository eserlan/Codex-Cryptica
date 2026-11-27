/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import GeneratorOutputCard from "./GeneratorOutputCard.svelte";
import {
  generatePointCrawlNetworkLocal,
  pointCrawlNodeRoleLabel,
  pointCrawlNodeRoleSymbol,
} from "generator-engine";
import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";

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

  it("renders a point role as a labelled icon badge without Markdown markers", () => {
    const crawl = generatePointCrawlNetworkLocal({ pointCount: 6 });
    const node = crawl.nodes[0];
    const label = pointCrawlNodeRoleLabel(node);
    const heading = `1. ${node.name} (${pointCrawlNodeRoleSymbol(node)} ${label})`;
    const data = { ...sampleData, pointCrawl: crawl };
    const { container } = render(GeneratorOutputCard, {
      props: {
        generatedData: data,
        aiFallbackDismissed: false,
        isBusy: false,
        isExampleDraft: false,
        generatedSingular: "Point Crawl",
        variant: "default",
        worldTheme: "Classic Fantasy",
        documentContent: "",
        copied: false,
        copiedSectionId: null,
        contextTrimmed: false,
        documentSections: [
          {
            id: "point",
            heading,
            markdown: `### ${heading}`,
            body: "A place.",
          },
        ],
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
    const title = screen.getByRole("heading", { name: new RegExp(node.name) });
    expect(title.textContent).toContain(label);
    expect(title.textContent).not.toContain("*");
    expect(title.querySelector('[aria-hidden="true"]')?.className).toContain(
      "icon-[lucide--",
    );
    expect(container.textContent).toContain("A place.");
  });

  it("uses 18px, relaxed typography for generated long-form copy", () => {
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
    expect(seoMdContainer?.classList.contains("text-lg")).toBe(true);
    expect(seoMdContainer?.classList.contains("leading-relaxed")).toBe(true);
    expect(seoMdContainer?.classList.contains("break-words")).toBe(true);
    expect(seoMdContainer?.classList.contains("text-base")).toBe(false);
    expect(seoMdContainer?.classList.contains("[&_pre]:overflow-x-auto")).toBe(
      true,
    );
    expect(seoMdContainer?.classList.contains("[&_pre]:max-w-full")).toBe(true);
  });

  it("offers separate GM case-file and spoiler-safe player-handout copies", async () => {
    const mysteryData: GeneratorOutput = {
      ...sampleData,
      type: "note",
      title: "The Quiet Bell",
      summary: "A keeper vanished.",
      content: "## Evidence\nA witness heard the bell.",
      lore: "## GM-Only Truth\nMara moved the ledger.",
      labels: ["mystery-generator"],
    };
    const onCopyMarkdown = vi.fn();
    const onCopySection = vi.fn();
    render(GeneratorOutputCard, {
      props: {
        generatedData: mysteryData,
        aiFallbackDismissed: false,
        isBusy: false,
        isExampleDraft: false,
        generatedSingular: "Mystery",
        variant: "default",
        worldTheme: "Classic Fantasy",
        documentContent: mysteryData.content,
        documentSections: sampleSections,
        copied: false,
        copiedSectionId: null,
        contextTrimmed: false,
        onDismissAiFallback: vi.fn(),
        onSaveToCodex: vi.fn(),
        onCopyMarkdown,
        onCopySection,
        onContainerClick: vi.fn(),
        onContainerKeydown: vi.fn(),
        onSelectHubEntity: vi.fn(),
        onSaveHubToCodex: vi.fn(),
      },
    });

    expect(
      screen.getByRole("button", { name: "Copy GM Case File" }),
    ).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Copy GM Case File" }),
    );
    expect(onCopyMarkdown).toHaveBeenCalledTimes(1);
    await fireEvent.click(
      screen.getByRole("button", { name: "Copy Player Handout" }),
    );

    expect(onCopySection).toHaveBeenCalledTimes(1);
    expect(onCopySection).toHaveBeenCalledWith(
      "player-handout",
      expect.stringContaining("A witness heard the bell."),
    );
    expect(onCopySection.mock.calls[0][1]).not.toContain(
      "Mara moved the ledger",
    );
  });

  it("keeps fenced code blocks from overflowing the card on mobile", () => {
    const { container } = render(GeneratorOutputCard, {
      props: {
        generatedData: {
          ...sampleData,
          content:
            "```\nA very long unbroken line of preformatted code that would otherwise overflow the card on narrow screens\n```",
        },
        aiFallbackDismissed: false,
        isBusy: false,
        isExampleDraft: false,
        generatedSingular: "Faction",
        variant: "default",
        worldTheme: "Classic Fantasy",
        documentContent:
          "```\nA very long unbroken line of preformatted code that would otherwise overflow the card on narrow screens\n```",
        documentSections: [
          {
            id: "sec-1",
            heading: "What they control",
            markdown:
              "```\nA very long unbroken line of preformatted code that would otherwise overflow the card on narrow screens\n```",
            body: "```\nA very long unbroken line of preformatted code that would otherwise overflow the card on narrow screens\n```",
          },
        ],
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

    const pre = container.querySelector(".seo-md pre");
    expect(pre).toBeTruthy();
    expect(
      pre?.closest(".seo-md")?.classList.contains("[&_pre]:overflow-x-auto"),
    ).toBe(true);
  });

  it("renders Generate Roster and per-member Open as Character with interpolated aria-labels alongside the roster continuation (#2808)", async () => {
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

    const onOpenMemberAsCharacter = vi.fn();
    const onSaveToCodex = vi.fn();
    const { container } = render(GeneratorOutputCard, {
      props: {
        generatedData: rosterData,
        aiFallbackDismissed: false,
        isBusy: false,
        isExampleDraft: false,
        generatorType: "faction-roster",
        canFollowUp: true,
        generatedSingular: "Faction Roster",
        variant: "default",
        worldTheme: "Classic Fantasy",
        documentContent: rosterData.content,
        documentSections: rosterSections,
        copied: false,
        copiedSectionId: null,
        contextTrimmed: false,
        onDismissAiFallback: vi.fn(),
        onSaveToCodex,
        onCopyMarkdown: vi.fn(),
        onCopySection: vi.fn(),
        onContainerClick: vi.fn(),
        onContainerKeydown: vi.fn(),
        onSelectHubEntity: vi.fn(),
        onSaveHubToCodex: vi.fn(),
        onOpenMemberAsCharacter,
      },
    });

    // The aria-label must interpolate the actual member heading, not the
    // literal template text — this is the same interpolation pattern the
    // pre-existing "Copy MD" button already uses successfully.
    const open = screen.getByLabelText(
      "Open Vess Marrow — Quartermaster as a Character",
    );
    const callout = screen.getByTestId("generator-continuation-callout");
    expect(
      callout.compareDocumentPosition(open) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.querySelectorAll("#save-to-codex-btn")).toHaveLength(1);
    expect(container.querySelector("#copy-markdown-btn")).toBeTruthy();
    await fireEvent.click(open);
    expect(onOpenMemberAsCharacter).toHaveBeenCalledWith(
      rosterSections[0],
      rosterData,
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Add to my Codex" }),
    );
    expect(onSaveToCodex).toHaveBeenCalledTimes(1);
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

  it("shows Create D&D Magic Item for an item draft when onSendToMonsterLabs is provided", () => {
    const itemData: GeneratorOutput = {
      ...sampleData,
      type: "item",
      labels: ["rpg-item"],
    };
    render(GeneratorOutputCard, {
      props: {
        generatedData: itemData,
        aiFallbackDismissed: false,
        isBusy: false,
        isExampleDraft: false,
        generatedSingular: "Item",
        variant: "default",
        worldTheme: "Classic Fantasy",
        documentContent: itemData.content,
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
      screen.getByRole("button", { name: /create d&d magic item/i }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /^create d&d monster$/i }),
    ).toBeNull();
  });

  it("calls onSendToMonsterLabs with the current draft for an item", async () => {
    const itemData: GeneratorOutput = {
      ...sampleData,
      type: "item",
      labels: [],
    };
    const onSendToMonsterLabs = vi.fn();
    render(GeneratorOutputCard, {
      props: {
        generatedData: itemData,
        aiFallbackDismissed: false,
        isBusy: false,
        isExampleDraft: false,
        generatedSingular: "Item",
        variant: "default",
        worldTheme: "Classic Fantasy",
        documentContent: itemData.content,
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
      screen.getByRole("button", { name: /create d&d magic item/i }),
    );

    expect(onSendToMonsterLabs).toHaveBeenCalledWith(itemData);
  });

  describe("AI notices", () => {
    function renderNotice(
      data: Partial<GeneratorOutput>,
      extra: Record<string, unknown> = {},
    ) {
      const props = {
        generatedData: { ...sampleData, ...data },
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
        ...extra,
      };
      render(GeneratorOutputCard, { props: props as never });
      return props;
    }

    it("keeps the short message for other generators and offers a retry", async () => {
      const onRetryAi = vi.fn();
      renderNotice({ aiFallback: true }, { onRetryAi });
      expect(
        screen.getByText(/AI generation was unavailable, so Codex created/),
      ).toBeTruthy();
      await fireEvent.click(
        screen.getByRole("button", { name: /retry with ai/i }),
      );
      expect(onRetryAi).toHaveBeenCalledTimes(1);
    });

    it("says plainly that a one-shot fallback is not the full adventure", () => {
      renderNotice({ aiFallback: true, kind: "one-shot" });
      expect(screen.getByText("AI generation didn't finish")).toBeTruthy();
      expect(screen.getByText(/may have timed out/)).toBeTruthy();
      expect(
        screen.getByText(/not the full AI-generated adventure/),
      ).toBeTruthy();
    });

    it("tells the GM when the AI review didn't finish", () => {
      renderNotice({ aiReviewSkipped: true, kind: "one-shot" });
      expect(
        screen.getByText("Generated, but the AI review didn't finish"),
      ).toBeTruthy();
      expect(screen.getByText(/Before You Run It/)).toBeTruthy();
    });

    it("shows no notice for a clean AI draft or a local one", () => {
      renderNotice({});
      expect(screen.queryByTestId("ai-fallback-notice")).toBeNull();
    });

    it("hides the retry button while generating and without a handler", () => {
      renderNotice({ aiFallback: true }, { onRetryAi: vi.fn(), isBusy: true });
      expect(
        screen.queryByRole("button", { name: /retry with ai/i }),
      ).toBeNull();
    });

    it("names the parts written from templates", () => {
      renderNotice({
        kind: "one-shot",
        aiPartialFallback: ["Act II: The Mill", "Supporting characters"],
      });
      expect(
        screen.getByText("Some parts were written from templates"),
      ).toBeTruthy();
      expect(
        screen.getByText(/Act II: The Mill, Supporting characters/),
      ).toBeTruthy();
    });

    it("shows template parts and a skipped review together", () => {
      renderNotice({
        kind: "one-shot",
        aiPartialFallback: ["Finale and endings"],
        aiReviewSkipped: true,
      });
      expect(
        screen.getByText("Some parts were written from templates"),
      ).toBeTruthy();
      expect(
        screen.getByText("Generated, but the AI review didn't finish"),
      ).toBeTruthy();
    });

    it("shows each generation step while busy instead of flavour text", () => {
      renderNotice(
        {},
        {
          isBusy: true,
          generatedSingular: "One-Shot",
          progressSteps: [
            {
              id: "core",
              label: "Premise, villain and stakes",
              status: "done",
            },
            {
              id: "scenes",
              label: "Writing the scenes",
              status: "active",
              detail: "2 of 5",
            },
            {
              id: "npcs",
              label: "Supporting characters",
              status: "fallback",
            },
            { id: "review", label: "Checking it runs", status: "pending" },
          ],
        },
      );
      expect(screen.getByText("Building your one-shot")).toBeTruthy();
      const list = screen.getByTestId("generation-progress");
      expect(list.textContent).toContain("Premise, villain and stakes");
      expect(list.textContent).toContain("2 of 5");
      expect(list.textContent).toContain("used a template");
      expect(
        list.querySelector('[aria-current="step"]')?.textContent,
      ).toContain("Writing the scenes");
    });

    it("keeps the rotating messages when there are no steps", () => {
      renderNotice({}, { isBusy: true });
      expect(screen.queryByTestId("generation-progress")).toBeNull();
    });

    it("stays until dismissed, then goes away", async () => {
      const props = renderNotice({ aiFallback: true, kind: "one-shot" });
      expect(screen.getByTestId("ai-fallback-notice")).toBeTruthy();
      await fireEvent.click(
        screen.getByRole("button", { name: "Dismiss notice" }),
      );
      expect(props.onDismissAiFallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("Wave 1 continuation callout", () => {
    function renderCard(overrides: Partial<Record<string, unknown>> = {}) {
      const onSaveToCodex = vi.fn();
      const result = render(GeneratorOutputCard, {
        props: {
          generatedData: sampleData,
          aiFallbackDismissed: false,
          isBusy: false,
          isGenerationInProgress: false,
          isExampleDraft: false,
          generatorType: "npc",
          canFollowUp: true,
          generatedSingular: "NPC",
          variant: "default" as const,
          worldTheme: "Classic Fantasy",
          documentContent: sampleData.content,
          documentSections: sampleSections,
          copied: false,
          copiedSectionId: null,
          contextTrimmed: false,
          onDismissAiFallback: vi.fn(),
          onSaveToCodex,
          onCopyMarkdown: vi.fn(),
          onCopySection: vi.fn(),
          onContainerClick: vi.fn(),
          onContainerKeydown: vi.fn(),
          onSelectHubEntity: vi.fn(),
          onSaveHubToCodex: vi.fn(),
          ...overrides,
        },
      });
      return { ...result, onSaveToCodex };
    }

    it("renders the continuation callout with a single #save-to-codex-btn for Wave 1 generators after explicit generation", async () => {
      const { container, onSaveToCodex } = renderCard({
        generatorType: "star-system",
        canFollowUp: true,
        isExampleDraft: false,
      });

      const callout = screen.getByTestId("generator-continuation-callout");
      // The mobile callout must not revert to 12–14px body text.
      expect(callout.querySelector("h3")?.classList.contains("text-lg")).toBe(
        true,
      );
      expect(callout.querySelector("p")?.classList.contains("text-lg")).toBe(
        true,
      );
      expect(callout.querySelector("ul")?.classList.contains("text-lg")).toBe(
        true,
      );
      expect(callout.textContent).toContain("Keep this system connected");
      expect(callout.textContent).toContain(
        "No account needed; stored locally in this browser.",
      );
      expect(container.querySelectorAll("#save-to-codex-btn")).toHaveLength(1);
      expect(
        screen.queryByRole("button", { name: "Save to Codex" }),
      ).toBeNull();

      const addBtn = screen.getByRole("button", { name: "Add to my Codex" });
      expect(addBtn.id).toBe("save-to-codex-btn");
      expect(addBtn.classList.contains("whitespace-normal")).toBe(true);
      expect(addBtn.classList.contains("min-w-0")).toBe(true);
      expect(addBtn.classList.contains("max-w-full")).toBe(true);
      await fireEvent.click(addBtn);
      expect(onSaveToCodex).toHaveBeenCalledTimes(1);
    });

    it("places Personality's callout before the document without changing Copy or the other draft actions", async () => {
      const characterData: GeneratorOutput = {
        ...sampleData,
        type: "character",
        kind: "personality",
        title: "Iona Pell",
        labels: ["personality", "personality-generator", "imported-draft"],
      };
      const onCopyMarkdown = vi.fn();
      const onSendToMonsterLabs = vi.fn();
      const { container, onSaveToCodex } = renderCard({
        generatedData: characterData,
        generatorType: "personality",
        generatedSingular: "Character",
        onCopyMarkdown,
        onSendToMonsterLabs,
      });
      const callout = screen.getByTestId("generator-continuation-callout");
      const copy = screen.getByRole("button", { name: /^Copy$/ });
      const section = screen.getByText(
        "Brotherhood of Hollow Crown is a fallen order with real authority.",
      );
      expect(
        copy.compareDocumentPosition(callout) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        callout.compareDocumentPosition(section) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(container.querySelectorAll("#save-to-codex-btn")).toHaveLength(1);
      expect(callout.textContent).toContain("one new Character");
      await fireEvent.click(copy);
      expect(onCopyMarkdown).toHaveBeenCalledTimes(1);
      await fireEvent.click(
        screen.getByRole("button", { name: /Create D&D Monster/i }),
      );
      expect(onSendToMonsterLabs).toHaveBeenCalledWith(characterData);
      await fireEvent.click(
        screen.getByRole("button", { name: "Add to my Codex" }),
      );
      expect(onSaveToCodex).toHaveBeenCalledTimes(1);
    });

    it("puts the quest continuation between draft actions and the document without duplicating Save", async () => {
      const { container, onSaveToCodex } = renderCard({
        generatorType: "quest",
      });
      const callout = screen.getByTestId("generator-continuation-callout");
      const copy = container.querySelector("#copy-markdown-btn")!;
      const section = screen.getByText(
        "Brotherhood of Hollow Crown is a fallen order with real authority.",
      );
      expect(
        copy.compareDocumentPosition(callout) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        callout.compareDocumentPosition(section) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(container.querySelectorAll("#save-to-codex-btn")).toHaveLength(1);
      expect(callout.textContent).toContain("GM-only lore");
      await fireEvent.click(
        screen.getByRole("button", { name: "Add to my Codex" }),
      );
      expect(onSaveToCodex).toHaveBeenCalledTimes(1);
    });

    it("hides the callout and keeps Save to Codex on seed/example drafts, unconfirmed runs, busy states, and Wave 2 generators", () => {
      for (const overrides of [
        {
          generatorType: "faction-roster",
          canFollowUp: false,
          isExampleDraft: true,
        },
        { generatorType: "faction-roster", canFollowUp: true, isBusy: true },
        { generatorType: "quest", canFollowUp: false, isExampleDraft: true },
        { generatorType: "quest", canFollowUp: false, isExampleDraft: false },
        { generatorType: "quest", canFollowUp: true, isBusy: true },
        { generatorType: "npc", canFollowUp: false, isExampleDraft: true },
        { generatorType: "npc", canFollowUp: false, isExampleDraft: false },
        { generatorType: "npc", canFollowUp: true, isBusy: true },
        {
          generatorType: "origin-generator",
          canFollowUp: true,
          isGenerationInProgress: true,
        },
        { generatorType: "point-crawl", canFollowUp: true },
      ]) {
        const { unmount } = renderCard(overrides);
        expect(
          screen.queryByTestId("generator-continuation-callout"),
        ).toBeNull();
        expect(
          screen.getByRole("button", { name: "Save to Codex" }),
        ).toBeTruthy();
        unmount();
      }
    });

    it("never renders the callout or save button for variant='names'", () => {
      const { container } = renderCard({
        generatorType: "npc",
        canFollowUp: true,
        variant: "names",
      });
      expect(screen.queryByTestId("generator-continuation-callout")).toBeNull();
      expect(container.querySelector("#save-to-codex-btn")).toBeNull();
    });

    it("renders a visible role='alert' saveError inside the continuation callout", () => {
      renderCard({
        generatorType: "origin-generator",
        canFollowUp: true,
        saveError:
          "Storage access is blocked. Please copy the Markdown below instead.",
      });
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("Storage access is blocked");
    });
  });

  it("disables the save button and marks it busy while saving", () => {
    const base = {
      generatedData: sampleData,
      aiFallbackDismissed: false,
      isBusy: false,
      isExampleDraft: false,
      generatedSingular: "Faction",
      variant: "default" as const,
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
    };
    const saving = render(GeneratorOutputCard, {
      props: { ...base, isSaving: true },
    });
    const busy = saving.container.querySelector("#save-to-codex-btn")!;
    expect(busy.hasAttribute("disabled")).toBe(true);
    expect(busy.getAttribute("aria-busy")).toBe("true");
    saving.unmount();

    const idle = render(GeneratorOutputCard, { props: base });
    const button = idle.container.querySelector("#save-to-codex-btn")!;
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(button.getAttribute("aria-busy")).toBe("false");
  });
});
