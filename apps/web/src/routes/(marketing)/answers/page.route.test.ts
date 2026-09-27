/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import Page from "./+page.svelte";
import {
  AnswerConfigSchema,
  type AnswerConfig,
} from "$lib/content/answers/schema";

vi.mock("$app/paths", () => ({ base: "" }));

const mockAnswers: AnswerConfig[] = [
  AnswerConfigSchema.parse({
    slug: "how-do-you-run-a-heist",
    category: "adventure-design",
    question: "How do you run a heist?",
    kind: "framework",
    shortAnswer:
      "Heists work best with phases: legwork, infiltration, complication, extraction.",
    sections: [
      {
        kind: "prose",
        heading: "Phases",
        paragraphs: ["Legwork is critical."],
      },
    ],
    relatedAnswers: [],
    publishedAt: "2026-09-01",
    seo: { title: "How to run a heist", description: "Heist guide" },
  }),
  AnswerConfigSchema.parse({
    slug: "how-to-manage-table-engagement",
    category: "running-the-game",
    question: "How do you keep players engaged at the table?",
    kind: "how-to",
    shortAnswer:
      "Keep pacing active by asking direct questions and rotating spotlights every 10 minutes.",
    sections: [
      {
        kind: "prose",
        heading: "Spotlight",
        paragraphs: ["Rotate spotlight."],
      },
    ],
    relatedAnswers: [],
    publishedAt: "2026-09-02",
    seo: { title: "Player Engagement", description: "Keep players engaged" },
  }),
  AnswerConfigSchema.parse({
    slug: "what-is-a-point-crawl",
    category: "worldbuilding",
    question: "What is a point crawl?",
    kind: "definition",
    shortAnswer:
      "A point crawl connects distinct locations with marked paths rather than a hex grid.",
    sections: [
      { kind: "prose", heading: "Structure", paragraphs: ["Nodes and edges."] },
    ],
    relatedAnswers: [],
    publishedAt: "2026-09-03",
    seo: {
      title: "What is a point crawl",
      description: "Point crawl definition",
    },
  }),
];

describe("/answers route", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders page header and category directory cards for all 6 categories", () => {
    render(Page, {
      props: { data: { answers: mockAnswers } },
    });

    expect(document.title).toContain("RPG and worldbuilding answers");

    const categoryNav = document.querySelector(
      'nav[aria-label="Category directory"]',
    );
    expect(categoryNav).toBeTruthy();

    const categoryButtons = categoryNav?.querySelectorAll("button");
    expect(categoryButtons?.length).toBe(6);

    const buttonTexts = Array.from(categoryButtons || []).map(
      (b) => b.textContent,
    );
    expect(
      buttonTexts.some((t) => t?.includes("Adventure & Encounter Design")),
    ).toBe(true);
    expect(buttonTexts.some((t) => t?.includes("Running at the Table"))).toBe(
      true,
    );
    expect(
      buttonTexts.some((t) => t?.includes("Worldbuilding & Setting Design")),
    ).toBe(true);
    expect(
      buttonTexts.some((t) => t?.includes("Getting Started & Table Setup")),
    ).toBe(true);
    expect(
      buttonTexts.some((t) => t?.includes("Session Prep & Planning")),
    ).toBe(true);
    expect(
      buttonTexts.some((t) => t?.includes("Notes & Campaign Management")),
    ).toBe(true);
  });

  it("renders format filter chips", () => {
    render(Page, {
      props: { data: { answers: mockAnswers } },
    });

    const formatContainer = document.querySelector(
      'div[aria-label="Filter answers by format"]',
    );
    expect(formatContainer).toBeTruthy();
    expect(formatContainer?.textContent).toContain("All Formats");
    expect(formatContainer?.textContent).toContain("How-To");
    expect(formatContainer?.textContent).toContain("Frameworks");
    expect(formatContainer?.textContent).toContain("Definitions");
    expect(formatContainer?.textContent).toContain("Comparisons");
  });

  it("filters answers when a category card or pill is clicked", async () => {
    const { container } = render(Page, {
      props: { data: { answers: mockAnswers } },
    });

    const adventurePill = container.querySelector(
      'button[role="tab"][aria-selected="false"]',
    );
    expect(adventurePill).toBeTruthy();

    // Click adventure design directory card or pill
    const adventureCard = Array.from(
      container.querySelectorAll('nav[aria-label="Category directory"] button'),
    ).find((b) => b.textContent?.includes("Adventure & Encounter Design"));
    expect(adventureCard).toBeTruthy();

    await fireEvent.click(adventureCard!);

    // Should show filtered view with 1 result
    expect(container.textContent).toContain("Showing 1 of 3 answers");
    expect(container.textContent).toContain("How do you run a heist?");
    expect(container.textContent).not.toContain("What is a point crawl?");
  });

  it("filters answers when search query is entered and shows negative empty state when no match", async () => {
    const { container } = render(Page, {
      props: { data: { answers: mockAnswers } },
    });

    const searchInput = container.querySelector(
      "#answers-search",
    ) as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    await fireEvent.input(searchInput, {
      target: { value: "nonexistent keyword xyz" },
    });

    expect(container.textContent).toContain("No answers found");
    expect(container.textContent).toContain("Clear search & filters");

    const clearButton = container.querySelector(
      'button[aria-label="Clear search"]',
    ) as HTMLButtonElement;
    if (clearButton) {
      await fireEvent.click(clearButton);
      expect(searchInput.value).toBe("");
    }
  });

  it("filters by format kind chips", async () => {
    const { container } = render(Page, {
      props: { data: { answers: mockAnswers } },
    });

    const frameworkChip = Array.from(
      container.querySelectorAll(
        'div[aria-label="Filter answers by format"] button',
      ),
    ).find((b) => b.textContent?.includes("Frameworks"));
    expect(frameworkChip).toBeTruthy();

    await fireEvent.click(frameworkChip!);

    expect(container.textContent).toContain("format: Framework");
    expect(container.textContent).toContain("How do you run a heist?");
    expect(container.textContent).not.toContain("What is a point crawl?");
  });
});
